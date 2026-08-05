import { beforeEach, describe, expect, it } from "vitest";

import { and, eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import {
  attendanceDays,
  attendanceDevices,
  attendanceEvents,
  attendancePushBatches,
  branches,
  branchWorkingDays,
  roles,
  user,
  userRoles,
} from "@UnifiedAttendance/db/schema/index";

import { deviceHandshake, receivePush } from "../../../src/modules/devices/adms";
import { parseAttlog } from "../../../src/modules/devices/adms-protocol";
import { assignIdentity } from "../../../src/modules/devices/service";
import { createEmployee } from "../../../src/modules/workforce/service";
import { resetDatabase, testContext } from "../../fixtures";
import { createInnerContext } from "../../../src/context";

const officer = testContext("officer");
/** The reader has no session — that is the whole point of the protocol. */
const reader = createInnerContext({ session: null });

const SERIAL = "BOCK200961014";
const MONDAY = "2026-02-09";

describe("ADMS protocol parsing", () => {
  it("reads a real SpeedFace ATTLOG body", () => {
    const { records, rejected } = parseAttlog(
      ["1001\t2026-02-09 08:05:37\t0\t15\t0\t0\t0", "1002\t2026-02-09 17:31:02\t1\t1\t\t0\t0"].join(
        "\r\n",
      ),
    );

    expect(rejected).toEqual([]);
    expect(records).toEqual([
      {
        identityNumber: "1001",
        localTime: "2026-02-09 08:05:37",
        localDate: MONDAY,
        direction: "in",
        punchState: "0",
        verifyMode: "15",
      },
      {
        identityNumber: "1002",
        localTime: "2026-02-09 17:31:02",
        localDate: MONDAY,
        direction: "out",
        punchState: "1",
        verifyMode: "1",
      },
    ]);
  });

  it("keeps a punch whose status it does not recognise", () => {
    const { records } = parseAttlog("1001\t2026-02-09 08:05:37\t9\t1");
    // The punch happened; only its direction is in doubt.
    expect(records[0]?.direction).toBe("unknown");
  });

  it("sets aside lines it cannot read without losing the rest", () => {
    const { records, rejected } = parseAttlog(
      ["garbage", "", "1001\t2026-02-09 08:05:37\t0\t1", "\t2026-02-09 09:00:00\t0\t1"].join("\n"),
    );
    expect(records).toHaveLength(1);
    expect(rejected).toEqual(["garbage", "\t2026-02-09 09:00:00\t0\t1"]);
  });
});

describe("ADMS ingestion", () => {
  let branchId: string;
  let deviceId: string;
  let employeeId: string;

  beforeEach(async () => {
    await resetDatabase();
    await db.insert(user).values({
      id: "officer",
      name: "Sara Tesfaye",
      email: "sara@example.test",
      emailVerified: true,
    });
    const [admin] = await db.select().from(roles).where(eq(roles.name, "Admin")).limit(1);
    await db.insert(userRoles).values({ userId: "officer", roleId: admin!.id });

    // Addis Ababa: UTC+3 all year, so 08:05 local is 05:05Z.
    const [branch] = await db
      .insert(branches)
      .values({ name: "Head Office", code: "HQ", timezone: "Africa/Addis_Ababa" })
      .returning();
    branchId = branch!.id;
    await db.insert(branchWorkingDays).values({
      branchId,
      weekday: 1,
      isWorkingDay: true,
      openingTime: "09:00",
      closingTime: "17:00",
    });

    const [device] = await db
      .insert(attendanceDevices)
      .values({ branchId, name: "Main gate", serialNumber: SERIAL })
      .returning();
    deviceId = device!.id;

    const created = await createEmployee(officer, {
      person: { firstName: "Hanna", lastName: "Girma" },
      employee: {
        branchId,
        employeeCode: "EMP-500",
        employmentType: "permanent",
        hireDate: "2026-01-05",
        status: "active",
      },
    } as never);
    employeeId = created.employee.id;
    await assignIdentity(officer, {
      employeeId,
      deviceIdentityNumber: "1001",
      validFrom: "2026-01-05",
      validTo: null,
    } as never);
  });

  const push = (body: string) =>
    receivePush(reader, {
      serialNumber: SERIAL,
      endpoint: "/iclock/cdata",
      table: "ATTLOG",
      rawBody: body,
    });

  it("reads the reader's clock as branch-local time, not UTC", async () => {
    const result = await push("1001\t2026-02-09 08:05:37\t0\t15\t0\t0\t0");
    expect(result.accepted).toBe(1);

    const [event] = await db
      .select()
      .from(attendanceEvents)
      .where(eq(attendanceEvents.deviceIdentityNumber, "1001"));
    // 08:05:37 in Addis is 05:05:37Z. Storing the wall clock as UTC would put
    // every punch three hours early and turn on-time arrivals into lateness.
    expect(event?.occurredAt).toEqual(new Date("2026-02-09T05:05:37.000Z"));
    expect(event?.employeeId).toBe(employeeId);
    expect(event?.direction).toBe("in");
  });

  it("derives the day so the punch shows up on the register at once", async () => {
    await push(["1001\t2026-02-09 08:05:37\t0\t15", "1001\t2026-02-09 17:31:02\t1\t15"].join("\n"));

    const [day] = await db
      .select()
      .from(attendanceDays)
      .where(
        and(eq(attendanceDays.employeeId, employeeId), eq(attendanceDays.attendanceDate, MONDAY)),
      );
    expect(day?.outcome).toBe("present");
    expect(day?.firstIn).toEqual(new Date("2026-02-09T05:05:37.000Z"));
    expect(day?.lastOut).toEqual(new Date("2026-02-09T14:31:02.000Z"));
    // Arrived before the 09:00 opening.
    expect(day?.lateMinutes).toBe(0);
  });

  it("ignores a punch it has already stored", async () => {
    const line = "1001\t2026-02-09 08:05:37\t0\t15";
    await push(line);
    await push(line);

    const stored = await db
      .select()
      .from(attendanceEvents)
      .where(eq(attendanceEvents.deviceId, deviceId));
    // Readers resend whenever delivery is in doubt; the same punch must not
    // become two.
    expect(stored).toHaveLength(1);
  });

  it("keeps a punch from a badge nobody is enrolled to", async () => {
    const result = await push("9999\t2026-02-09 08:05:37\t0\t15");

    expect(result.accepted).toBe(1);
    expect(result.unmatched).toBe(1);
    const [event] = await db
      .select()
      .from(attendanceEvents)
      .where(eq(attendanceEvents.deviceIdentityNumber, "9999"));
    // Unattributed, not discarded — an unenrolled badge is a thing somebody
    // needs to see, not a thing to hide.
    expect(event?.employeeId).toBeNull();
  });

  it("stores the body of a batch it cannot make sense of, and still says OK", async () => {
    const result = await push("this is not an attendance log");

    expect(result.accepted).toBe(0);
    expect(result.rejected).toBe(1);
    const [batch] = await db
      .select()
      .from(attendancePushBatches)
      .where(eq(attendancePushBatches.id, result.batchId));
    expect(batch?.rawBody).toBe("this is not an attendance log");
    expect(batch?.parseError).toMatch(/Could not read 1 line/);
    expect(batch?.processedAt).not.toBeNull();
  });

  it("logs an unregistered reader instead of dropping it on the floor", async () => {
    const result = await receivePush(reader, {
      serialNumber: "UNKNOWN-SN",
      endpoint: "/iclock/cdata",
      table: "ATTLOG",
      rawBody: "1001\t2026-02-09 08:05:37\t0\t15",
    });

    const [batch] = await db
      .select()
      .from(attendancePushBatches)
      .where(eq(attendancePushBatches.id, result.batchId));
    expect(batch?.deviceId).toBeNull();
    expect(batch?.parseError).toMatch(/No reader is registered/);
    expect(result.accepted).toBe(0);
  });

  it("counts any contact as the reader reporting in", async () => {
    const response = await deviceHandshake(reader, { serialNumber: SERIAL });

    expect(response).toContain(`GET OPTION FROM: ${SERIAL}`);
    // Without this line the reader batches punches instead of pushing them.
    expect(response).toContain("Realtime=1");
    expect(response).toContain("TimeZone=3");

    const [device] = await db
      .select()
      .from(attendanceDevices)
      .where(eq(attendanceDevices.id, deviceId));
    expect(device?.lastSeenAt).not.toBeNull();
  });
});
