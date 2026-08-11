import { beforeEach, describe, expect, it } from "vitest";

import { and, eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import {
  attendanceDays,
  attendanceDevices,
  attendanceEvents,
  branches,
  branchWorkingDays,
  roles,
  user,
  userRoles,
} from "@UnifiedAttendance/db/schema/index";

import {
  createCorrection,
  deleteCorrection,
  listCorrections,
} from "../../../src/modules/corrections/service";
import { createEmployee } from "../../../src/modules/workforce/service";
import { resetDatabase, testContext } from "../../fixtures";

const officer = testContext("officer");
const MONDAY = "2026-02-09";

describe("corrections", () => {
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
    await db.insert(branchWorkingDays).values({
      branchId: branch!.id,
      // Monday-first, the order the organization screen stores.
      weekday: 0,
      isWorkingDay: true,
      openingTime: "09:00",
      closingTime: "17:00",
    });
    const created = await createEmployee(officer, {
      person: { firstName: "Hanna", lastName: "Girma" },
      employee: {
        branchId: branch!.id,
        employeeCode: "EMP-500",
        employmentType: "permanent",
        hireDate: "2026-01-05",
        status: "active",
      },
    } as never);
    employeeId = created.employee.id;
    branchId = branch!.id;
  });

  function day() {
    return db
      .select()
      .from(attendanceDays)
      .where(
        and(eq(attendanceDays.employeeId, employeeId), eq(attendanceDays.attendanceDate, MONDAY)),
      )
      .limit(1);
  }

  it("takes effect the moment it is made, and names who made it", async () => {
    await createCorrection(officer, {
      employeeId,
      attendanceDate: MONDAY,
      type: "add_check_in",
      // Seconds survive the round trip: the devices record to the second.
      proposedTime: new Date("2026-02-09T08:05:37.000Z"),
      reason: "Device was offline at the gate.",
    } as never);

    const [recomputed] = await day();
    expect(recomputed?.firstIn).toEqual(new Date("2026-02-09T08:05:37.000Z"));
    expect(recomputed?.hasCorrection).toBe(true);

    const [logged] = await listCorrections(officer, { employeeId } as never);
    expect(logged?.appliedByName).toBe("Sara Tesfaye");
  });

  it("puts the day back when the correction is undone", async () => {
    const created = await createCorrection(officer, {
      employeeId,
      attendanceDate: MONDAY,
      type: "mark_present",
      reason: "Worked from the client site all day.",
    } as never);
    await expect(day()).resolves.toMatchObject([{ outcome: "present", hasCorrection: true }]);

    await deleteCorrection(officer, { id: created!.id } as never);

    await expect(day()).resolves.toHaveLength(0);
    await expect(listCorrections(officer, { employeeId } as never)).resolves.toHaveLength(0);
  });

  it("refuses a check-in later than the recorded check-out, and keeps nothing", async () => {
    const [device] = await db
      .insert(attendanceDevices)
      .values({ branchId, name: "Gate reader", serialNumber: "ZK-1" })
      .returning();
    await db.insert(attendanceEvents).values([
      {
        deviceId: device!.id,
        employeeId,
        deviceIdentityNumber: "1001",
        occurredAt: new Date("2026-02-09T06:30:00.000Z"),
        direction: "in",
      },
      {
        deviceId: device!.id,
        employeeId,
        deviceIdentityNumber: "1001",
        occurredAt: new Date("2026-02-09T07:52:00.000Z"),
        direction: "out",
      },
    ]);


    await expect(
      createCorrection(officer, {
        employeeId,
        attendanceDate: MONDAY,
        type: "add_check_in",
        proposedTime: new Date("2026-02-09T09:00:00.000Z"),
        reason: "Device was offline at the gate.",
      } as never),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    await expect(listCorrections(officer, { employeeId } as never)).resolves.toHaveLength(0);
    await expect(day()).resolves.toHaveLength(0);
  });
});
