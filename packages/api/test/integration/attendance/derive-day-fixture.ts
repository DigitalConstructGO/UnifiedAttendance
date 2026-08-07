import { db } from "@UnifiedAttendance/db";
import {
  attendanceCorrections,
  attendanceDevices,
  attendanceEvents,
  branches,
  branchWorkingDays,
  employees,
  people,
  user,
} from "@UnifiedAttendance/db/schema/index";

import { deriveAttendanceDay } from "../../../src/attendance/derive-day";
import { resetDatabase, testContext } from "../../fixtures";

export const MONDAY = "2026-03-02";
export const TUESDAY = "2026-03-03";
export const SATURDAY = "2026-03-07";

export type DeriveDayFixture = {
  branchId: string;
  employeeId: string;
  deviceId: string;
  addEvent: (occurredAt: string, direction: "in" | "out" | "unknown") => Promise<void>;
  addCorrection: (
    type?: "add_check_out" | "mark_absent" | "mark_present" | "excuse_lateness",
  ) => Promise<void>;
  derive: (attendanceDate?: string) => ReturnType<typeof deriveAttendanceDay>;
};

/**
 * Resets the database and seeds one branch, one Monday-working schedule,
 * one employee, and one device. Call from `beforeEach`.
 */
export async function setUpDeriveDayFixture(): Promise<DeriveDayFixture> {
  await resetDatabase();

  const [branch] = await db
    .insert(branches)
    .values({ name: "Head Office", code: "HQ", timezone: "Africa/Addis_Ababa" })
    .returning();
  const branchId = branch!.id;

  await db.insert(branchWorkingDays).values({
    branchId,
    // Monday, in the Monday-first order the organization screen stores.
    weekday: 0,
    isWorkingDay: true,
    openingTime: "09:00:00",
    closingTime: "17:00:00",
  });

  const [person] = await db
    .insert(people)
    .values({ firstName: "Test", lastName: "Employee" })
    .returning();
  const [employee] = await db
    .insert(employees)
    .values({
      personId: person!.id,
      branchId,
      employeeCode: "EMP-1",
      hireDate: "2024-01-01",
    })
    .returning();
  const employeeId = employee!.id;

  const [device] = await db
    .insert(attendanceDevices)
    .values({ branchId, name: "Entrance", serialNumber: "SN-1" })
    .returning();
  const deviceId = device!.id;

  return {
    branchId,
    employeeId,
    deviceId,

    async addEvent(occurredAt, direction) {
      await db.insert(attendanceEvents).values({
        deviceId,
        employeeId,
        deviceIdentityNumber: "1001",
        occurredAt: new Date(occurredAt),
        direction,
      });
    },

    async addCorrection(type = "add_check_out") {
      const officerId = "00000000-0000-4000-8000-000000000001";
      await db.insert(user).values({
        id: officerId,
        name: "Correction Officer",
        email: "officer@example.test",
        emailVerified: true,
      });
      await db.insert(attendanceCorrections).values({
        employeeId,
        attendanceDate: MONDAY,
        type,
        proposedTime: type === "add_check_out" ? new Date("2026-03-02T17:00:00+03:00") : null,
        reason: "Attendance Device missed the event",
        appliedBy: officerId,
      });
    },

    derive(attendanceDate = MONDAY) {
      return deriveAttendanceDay(testContext(), { employeeId, attendanceDate });
    },
  };
}
