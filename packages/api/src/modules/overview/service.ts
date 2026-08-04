import { and, count, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";

import {
  attendanceCorrections,
  attendanceDays,
  attendanceDevices,
  attendanceEvents,
  branches,
  employees,
  employmentPeriods,
  people,
} from "@UnifiedAttendance/db/schema/index";

import { requirePermission } from "../shared/guards";

import type { OperationsOverviewInput } from "../../validations/overview";
import type { Context } from "../../context";

const TREND_DAYS = 7;
/** A device that has not spoken in this long is not merely quiet. */
const WARNING_AFTER_MINUTES = 15;
const OFFLINE_AFTER_MINUTES = 60;

function shiftDate(date: string, days: number) {
  const shifted = new Date(`${date}T12:00:00Z`);
  shifted.setUTCDate(shifted.getUTCDate() + days);
  return shifted.toISOString().slice(0, 10);
}

/**
 * One read for the whole landing page, aggregated in SQL.
 *
 * Deliberately does NOT call `deriveAttendanceDay` the way the register does.
 * The register derives per employee because it must show a correct row for each
 * one; doing that org-wide would be one round trip per head every time anyone
 * opens the dashboard. Here the stored `attendance_days` are read as they
 * stand, and the headcount they do not cover is reported as `notRecorded`
 * rather than quietly counted as present or absent.
 */
export async function getOperationsOverview(ctx: Context, input: OperationsOverviewInput) {
  await requirePermission(ctx, "attendance:read");

  const { date } = input;
  const trendFrom = shiftDate(date, -(TREND_DAYS - 1));
  const monthFrom = `${date.slice(0, 7)}-01`;

  const activeOn = (day: string) =>
    and(
      eq(employmentPeriods.status, "active"),
      lte(employmentPeriods.effectiveFrom, day),
      or(isNull(employmentPeriods.effectiveTo), gte(employmentPeriods.effectiveTo, day)),
    );

  const [
    [headcount],
    [branchCount],
    todayRows,
    trendRows,
    deviceRows,
    feedRows,
    [correctionsThisMonth],
    [unmatched],
  ] = await Promise.all([
    ctx.db.select({ value: count() }).from(employmentPeriods).where(activeOn(date)),

    ctx.db.select({ value: count() }).from(branches),

    // Today's outcomes, one row per bucket.
    ctx.db
      .select({
        outcome: attendanceDays.outcome,
        dayType: attendanceDays.dayType,
        late: sql<number>`count(*) filter (where ${attendanceDays.lateMinutes} > 0)::int`,
        missingPunch: sql<number>`count(*) filter (where ${attendanceDays.missingCheckIn} or ${attendanceDays.missingCheckOut})::int`,
        corrected: sql<number>`count(*) filter (where ${attendanceDays.hasCorrection})::int`,
        value: count(),
      })
      .from(attendanceDays)
      .where(eq(attendanceDays.attendanceDate, date))
      .groupBy(attendanceDays.outcome, attendanceDays.dayType),

    // The last seven days, so the page can show a shape and not just a number.
    ctx.db
      .select({
        date: attendanceDays.attendanceDate,
        present: sql<number>`count(*) filter (where ${attendanceDays.outcome} = 'present' and coalesce(${attendanceDays.lateMinutes}, 0) = 0)::int`,
        late: sql<number>`count(*) filter (where ${attendanceDays.lateMinutes} > 0)::int`,
        absent: sql<number>`count(*) filter (where ${attendanceDays.outcome} = 'absent' and ${attendanceDays.dayType} = 'working_day')::int`,
      })
      .from(attendanceDays)
      .where(
        and(
          gte(attendanceDays.attendanceDate, trendFrom),
          lte(attendanceDays.attendanceDate, date),
        ),
      )
      .groupBy(attendanceDays.attendanceDate)
      .orderBy(attendanceDays.attendanceDate),

    ctx.db
      .select({
        id: attendanceDevices.id,
        name: attendanceDevices.name,
        branchName: branches.name,
        status: attendanceDevices.status,
        lastSeenAt: attendanceDevices.lastSeenAt,
      })
      .from(attendanceDevices)
      .innerJoin(branches, eq(attendanceDevices.branchId, branches.id))
      .orderBy(desc(attendanceDevices.lastSeenAt)),

    // The live feed. Left-joined: a punch from an unenrolled badge still happened.
    ctx.db
      .select({
        id: attendanceEvents.id,
        occurredAt: attendanceEvents.occurredAt,
        direction: attendanceEvents.direction,
        identityNumber: attendanceEvents.deviceIdentityNumber,
        firstName: people.firstName,
        lastName: people.lastName,
        employeeCode: employees.employeeCode,
        deviceName: attendanceDevices.name,
        branchName: branches.name,
      })
      .from(attendanceEvents)
      .innerJoin(attendanceDevices, eq(attendanceEvents.deviceId, attendanceDevices.id))
      .innerJoin(branches, eq(attendanceDevices.branchId, branches.id))
      .leftJoin(employees, eq(attendanceEvents.employeeId, employees.id))
      .leftJoin(people, eq(employees.personId, people.id))
      .orderBy(desc(attendanceEvents.occurredAt))
      .limit(input.feed),

    ctx.db
      .select({ value: count() })
      .from(attendanceCorrections)
      .where(
        and(
          gte(attendanceCorrections.attendanceDate, monthFrom),
          lte(attendanceCorrections.attendanceDate, date),
        ),
      ),

    ctx.db
      .select({ value: count() })
      .from(attendanceEvents)
      .where(
        and(
          isNull(attendanceEvents.employeeId),
          gte(attendanceEvents.occurredAt, new Date(`${trendFrom}T00:00:00Z`)),
        ),
      ),
  ]);

  const working = todayRows.filter((row) => row.dayType === "working_day");
  const sum = (pick: (row: (typeof todayRows)[number]) => number) =>
    working.reduce((total, row) => total + pick(row), 0);

  // Coverage counts every stored day; the outcome figures below count only the
  // ones anyone is expected to show up for. Mixing the two would report a whole
  // branch as uncomputed every Saturday.
  const recorded = todayRows.reduce((total, row) => total + row.value, 0);
  const onWorkingDay = sum((row) => row.value);
  const late = sum((row) => row.late);
  const presentTotal = working
    .filter((row) => row.outcome === "present")
    .reduce((total, row) => total + row.value, 0);
  const headcountValue = headcount?.value ?? 0;

  const now = Date.now();
  const deviceAge = (lastSeenAt: Date | null) =>
    lastSeenAt === null ? Infinity : (now - lastSeenAt.getTime()) / 60_000;
  const devices = deviceRows.map((device) => ({
    ...device,
    health:
      device.status === "inactive" || deviceAge(device.lastSeenAt) > OFFLINE_AFTER_MINUTES
        ? ("offline" as const)
        : deviceAge(device.lastSeenAt) > WARNING_AFTER_MINUTES
          ? ("warning" as const)
          : ("online" as const),
  }));

  return {
    date,
    headcount: headcountValue,
    branches: branchCount?.value ?? 0,
    today: {
      recorded,
      onWorkingDay,
      present: presentTotal,
      onTime: presentTotal - late,
      late,
      absent: working
        .filter((row) => row.outcome === "absent")
        .reduce((total, row) => total + row.value, 0),
      missingPunch: sum((row) => row.missingPunch),
      corrected: sum((row) => row.corrected),
      // Days nobody has computed yet. Named, not guessed at.
      notRecorded: Math.max(0, headcountValue - recorded),
    },
    trend: Array.from({ length: TREND_DAYS }, (_, index) => {
      const day = shiftDate(trendFrom, index);
      const row = trendRows.find((entry) => entry.date === day);
      return {
        date: day,
        present: row?.present ?? 0,
        late: row?.late ?? 0,
        absent: row?.absent ?? 0,
      };
    }),
    devices: {
      total: devices.length,
      online: devices.filter((device) => device.health === "online").length,
      warning: devices.filter((device) => device.health === "warning").length,
      offline: devices.filter((device) => device.health === "offline").length,
      lastSeenAt: devices[0]?.lastSeenAt ?? null,
      rows: devices,
    },
    feed: feedRows,
    correctionsThisMonth: correctionsThisMonth?.value ?? 0,
    unmatchedPunches: unmatched?.value ?? 0,
  };
}
