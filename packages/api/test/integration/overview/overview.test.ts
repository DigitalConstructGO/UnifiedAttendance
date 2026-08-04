import { beforeEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import {
  attendanceDevices,
  attendanceEvents,
  branches,
  branchWorkingDays,
  roles,
  user,
  userRoles,
} from "@UnifiedAttendance/db/schema/index";

import { createCorrection } from "../../../src/modules/corrections/service";
import { getOperationsOverview } from "../../../src/modules/overview/service";
import { createEmployee } from "../../../src/modules/workforce/service";
import { resetDatabase, testContext } from "../../fixtures";

const officer = testContext("officer");
const MONDAY = "2026-02-09";

describe("operations overview", () => {
  let employeeId: string;
  let branchId: string;

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
    const [branch] = await db
      .insert(branches)
      .values({ name: "Head Office", code: "HQ" })
      .returning();
    branchId = branch!.id;
    await db.insert(branchWorkingDays).values({
      branchId,
      // JS weekday numbering: Monday is 1, matching loadDayContext's getUTCDay().
      weekday: 1,
      isWorkingDay: true,
      openingTime: "09:00",
      closingTime: "17:00",
    });
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
  });

  it("counts the headcount and reports the days nobody has computed", async () => {
    const overview = await getOperationsOverview(officer, { date: MONDAY, feed: 6 } as never);

    expect(overview.headcount).toBe(1);
    expect(overview.branches).toBe(1);
    // Nothing has derived this day, so it is named as uncomputed rather than
    // counted as an absence nobody has verified.
    expect(overview.today.recorded).toBe(0);
    expect(overview.today.notRecorded).toBe(1);
    expect(overview.trend).toHaveLength(7);
    expect(overview.trend.at(-1)?.date).toBe(MONDAY);
  });

  it("picks up a day once a correction computes it", async () => {
    await createCorrection(officer, {
      employeeId,
      attendanceDate: MONDAY,
      type: "add_check_in",
      proposedTime: new Date("2026-02-09T06:05:37.000Z"),
      reason: "Device was offline at the gate.",
    } as never);

    const overview = await getOperationsOverview(officer, { date: MONDAY, feed: 6 } as never);
    expect(overview.today.recorded).toBe(1);
    expect(overview.today.notRecorded).toBe(0);
    expect(overview.today.corrected).toBe(1);
    expect(overview.correctionsThisMonth).toBe(1);
  });

  it("shows an unenrolled punch in the feed and flags a silent device", async () => {
    const [device] = await db
      .insert(attendanceDevices)
      .values({
        branchId,
        name: "Gate reader",
        serialNumber: "ZK-1",
        lastSeenAt: new Date("2020-01-01T00:00:00Z"),
      })
      .returning();
    await db.insert(attendanceEvents).values({
      deviceId: device!.id,
      deviceIdentityNumber: "9999",
      employeeId: null,
      occurredAt: new Date("2026-02-09T06:00:00.000Z"),
      direction: "in",
    });

    const overview = await getOperationsOverview(officer, { date: MONDAY, feed: 6 } as never);

    expect(overview.devices).toMatchObject({ total: 1, online: 0, offline: 1 });
    expect(overview.feed).toHaveLength(1);
    expect(overview.feed[0]).toMatchObject({
      identityNumber: "9999",
      firstName: null,
      deviceName: "Gate reader",
      branchName: "Head Office",
    });
    expect(overview.unmatchedPunches).toBe(1);
  });
});
