import { eq, inArray, sql } from "drizzle-orm";

import {
  attendanceDevices,
  attendanceEvents,
  attendancePushBatches,
  branches,
  employeeDeviceIdentities,
} from "@UnifiedAttendance/db/schema/index";

import { deriveAttendanceDay } from "../../attendance/derive-day";
import { type AttendanceRecord, deviceOptionsResponse, parseAttlog } from "./adms-protocol";

import type { Context } from "../../context";

/**
 * The device side of the system. None of it is authenticated, because the
 * protocol gives the reader no way to authenticate: it sends its serial number
 * in the query string and nothing else. Treat these entry points as reachable
 * by anyone who can route to the host, and keep them behind the network.
 *
 * What that buys us is the only thing that matters — a punch reaches the
 * database seconds after the finger leaves the sensor.
 */

type KnownDevice = {
  id: string;
  branchId: string;
  timezone: string;
};

async function findDevice(ctx: Context, serialNumber: string): Promise<KnownDevice | null> {
  const [row] = await ctx.db
    .select({
      id: attendanceDevices.id,
      branchId: attendanceDevices.branchId,
      timezone: branches.timezone,
    })
    .from(attendanceDevices)
    .innerJoin(branches, eq(attendanceDevices.branchId, branches.id))
    .where(eq(attendanceDevices.serialNumber, serialNumber))
    .limit(1);
  return row ?? null;
}

/**
 * Every contact counts as the reader reporting in, not just an upload. A device
 * with nobody punching still polls for commands, and treating that silence as
 * an outage would light up the dashboard every night.
 */
async function markSeen(ctx: Context, serialNumber: string) {
  await ctx.db
    .update(attendanceDevices)
    .set({ lastSeenAt: new Date() })
    .where(eq(attendanceDevices.serialNumber, serialNumber));
}

export async function deviceHandshake(ctx: Context, input: { serialNumber: string }) {
  const device = await findDevice(ctx, input.serialNumber);
  await markSeen(ctx, input.serialNumber);

  // An unregistered reader is still answered, so it keeps calling and shows up
  // in the push log where somebody can decide whether to register it. Refusing
  // it would only make it vanish into a retry loop nobody can see.
  const offsetHours = device ? await zoneOffsetHours(ctx, device.timezone) : 0;
  return deviceOptionsResponse({
    serialNumber: input.serialNumber,
    timeZoneOffsetHours: offsetHours,
    stamp: String(Math.floor(Date.now() / 1000)),
  });
}

async function zoneOffsetHours(ctx: Context, timezone: string) {
  const { rows } = await ctx.db.execute<{ offset_hours: number }>(
    sql`select extract(epoch from (now() at time zone ${timezone}) - now())::float8 / 3600 as offset_hours`,
  );
  return Math.round(rows[0]?.offset_hours ?? 0);
}

/**
 * Turns each reader-local stamp into the instant it names in the branch's own
 * zone. Postgres does the conversion because it owns the tz database, which is
 * the only way an 08:05 punch on the morning a clock shifts lands correctly.
 */
async function toInstants(ctx: Context, localTimes: string[], timezone: string) {
  if (localTimes.length === 0) return [];
  // Each stamp is bound as its own parameter. Handing drizzle a JS array here
  // flattens it into separate placeholders and the query silently reads only
  // the first one, so the list is built explicitly.
  const stamps = sql.join(
    localTimes.map((localTime) => sql`${localTime}`),
    sql`, `,
  );
  const { rows } = await ctx.db.execute<{ ordinality: number; instant: number }>(sql`
    select t.ordinality::int as ordinality,
           extract(epoch from (t.local::timestamp at time zone ${timezone}))::float8 as instant
      from unnest(array[${stamps}]::text[]) with ordinality as t(local, ordinality)
  `);
  const instants: Date[] = [];
  for (const row of rows) instants[row.ordinality - 1] = new Date(row.instant * 1000);
  return instants;
}

async function resolveEmployees(
  ctx: Context,
  records: AttendanceRecord[],
): Promise<Map<string, string>> {
  const numbers = [...new Set(records.map((record) => record.identityNumber))];
  if (numbers.length === 0) return new Map();

  // A badge is only somebody's while its enrolment is in force, so the date of
  // the punch decides the owner — a re-issued badge must not backdate onto the
  // person who used to carry it.
  const rows = await ctx.db
    .select({
      number: employeeDeviceIdentities.deviceIdentityNumber,
      employeeId: employeeDeviceIdentities.employeeId,
      validFrom: employeeDeviceIdentities.validFrom,
      validTo: employeeDeviceIdentities.validTo,
    })
    .from(employeeDeviceIdentities)
    .where(inArray(employeeDeviceIdentities.deviceIdentityNumber, numbers));

  const owners = new Map<string, string>();
  for (const record of records) {
    const match = rows.find(
      (row) =>
        row.number === record.identityNumber &&
        row.validFrom <= record.localDate &&
        (row.validTo === null || row.validTo >= record.localDate),
    );
    if (match) owners.set(`${record.identityNumber}@${record.localDate}`, match.employeeId);
  }
  return owners;
}

export type PushResult = {
  batchId: string;
  accepted: number;
  rejected: number;
  unmatched: number;
};

/**
 * Stores the raw body first and parses second. A firmware that sends something
 * we cannot read must not cost us the punches inside it — the bytes are kept,
 * the failure is recorded on the batch, and the reader still gets its `OK` so
 * it moves on instead of resending the same batch until someone notices.
 */
export async function receivePush(
  ctx: Context,
  input: { serialNumber: string; endpoint: string; table: string | null; rawBody: string },
): Promise<PushResult> {
  const device = await findDevice(ctx, input.serialNumber);
  await markSeen(ctx, input.serialNumber);

  const [batch] = await ctx.db
    .insert(attendancePushBatches)
    .values({
      deviceSerialNumber: input.serialNumber,
      deviceId: device?.id ?? null,
      endpoint: input.endpoint,
      rawBody: input.rawBody,
    })
    .returning({ id: attendancePushBatches.id });
  if (!batch) throw new Error("Failed to store the push batch");

  const finish = async (values: { eventCount: number | null; parseError: string | null }) => {
    await ctx.db
      .update(attendancePushBatches)
      .set({ ...values, processedAt: new Date() })
      .where(eq(attendancePushBatches.id, batch.id));
  };

  if (!device) {
    await finish({
      eventCount: 0,
      parseError: `No reader is registered with serial number ${input.serialNumber}`,
    });
    return { batchId: batch.id, accepted: 0, rejected: 0, unmatched: 0 };
  }

  // Only attendance rows become events. Operation and enrolment logs are kept
  // raw for now — they are useful evidence, but nothing reads them yet.
  if (input.table !== null && input.table.toUpperCase() !== "ATTLOG") {
    await finish({ eventCount: 0, parseError: null });
    return { batchId: batch.id, accepted: 0, rejected: 0, unmatched: 0 };
  }

  try {
    const { records, rejected } = parseAttlog(input.rawBody);
    const instants = await toInstants(
      ctx,
      records.map((record) => record.localTime),
      device.timezone,
    );
    const owners = await resolveEmployees(ctx, records);

    let unmatched = 0;
    const values = records.map((record, index) => {
      const employeeId = owners.get(`${record.identityNumber}@${record.localDate}`) ?? null;
      if (employeeId === null) unmatched += 1;
      return {
        deviceId: device.id,
        deviceIdentityNumber: record.identityNumber,
        employeeId,
        occurredAt: instants[index]!,
        devicePunchState: record.punchState,
        deviceVerifyMode: record.verifyMode,
        direction: record.direction,
        rawPayload: record as unknown as Record<string, unknown>,
      };
    });

    if (values.length > 0) {
      // Readers resend on any doubt about delivery, so the same punch arrives
      // more than once as a matter of course. The unique index on
      // (device, badge, instant) is what makes that harmless.
      await ctx.db.insert(attendanceEvents).values(values).onConflictDoNothing();
    }

    await finish({
      eventCount: values.length,
      parseError: rejected.length > 0 ? `Could not read ${rejected.length} line(s)` : null,
    });

    await recomputeTouchedDays(ctx, records, owners);

    return {
      batchId: batch.id,
      accepted: values.length,
      rejected: rejected.length,
      unmatched,
    };
  } catch (error) {
    await finish({
      eventCount: null,
      parseError: error instanceof Error ? error.message : String(error),
    });
    return { batchId: batch.id, accepted: 0, rejected: 0, unmatched: 0 };
  }
}

/**
 * A stored punch changes nothing until the day it belongs to is derived again.
 * Each (employee, day) is recomputed once however many punches arrived for it.
 */
async function recomputeTouchedDays(
  ctx: Context,
  records: AttendanceRecord[],
  owners: Map<string, string>,
) {
  const days = new Set<string>();
  for (const record of records) {
    const employeeId = owners.get(`${record.identityNumber}@${record.localDate}`);
    if (employeeId) days.add(`${employeeId}|${record.localDate}`);
  }
  for (const day of days) {
    const [employeeId, attendanceDate] = day.split("|") as [string, string];
    await deriveAttendanceDay(ctx, { employeeId, attendanceDate });
  }
}

/**
 * The command queue. Nothing enqueues commands yet, so the reader is always
 * told there is nothing to do — but it has to be answered on schedule, because
 * this poll is also how the device proves it is still alive.
 */
export async function deviceCommandPoll(ctx: Context, input: { serialNumber: string }) {
  await markSeen(ctx, input.serialNumber);
  return "OK";
}

/** The reader reporting what it did with a command it was given. */
export async function recordCommandResult(
  ctx: Context,
  input: { serialNumber: string; rawBody: string },
) {
  await markSeen(ctx, input.serialNumber);
  await ctx.db.insert(attendancePushBatches).values({
    deviceSerialNumber: input.serialNumber,
    deviceId: (await findDevice(ctx, input.serialNumber))?.id ?? null,
    endpoint: "/iclock/devicecmd",
    rawBody: input.rawBody,
    processedAt: new Date(),
    eventCount: 0,
  });
  return "OK";
}

export { deviceOptionsResponse, parseAttlog };
export type { AttendanceRecord };
