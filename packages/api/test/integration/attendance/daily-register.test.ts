import { beforeEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import {
  attendanceDays,
  branches,
  branchWorkingDays,
  employees,
  employmentPeriods,
  people,
  roles,
  user,
  userRoles,
} from "@UnifiedAttendance/db/schema/index";

import { listDailyRegister } from "../../../src/modules/attendance/service";
import { listDailyRegisterInput } from "../../../src/validations/attendance";
import { resetDatabase, testContext } from "../../fixtures";

const officer = testContext("officer");
const MONDAY = "2026-03-02";

async function seedEmployee(branchId: string, code: string) {
  const [person] = await db
    .insert(people)
    .values({ firstName: code, lastName: "Test" })
    .returning();
  const [employee] = await db
    .insert(employees)
    .values({ personId: person!.id, branchId, employeeCode: code, hireDate: "2025-01-01" })
    .returning();
  await db.insert(employmentPeriods).values({
    employeeId: employee!.id,
    branchId,
    effectiveFrom: "2025-01-01",
    status: "active",
  });
  return employee!.id;
}

describe("daily register", () => {
  let branchId: string;

  beforeEach(async () => {
    await resetDatabase();
    await db.insert(user).values({
      id: "officer",
      name: "Officer",
      email: "officer@example.test",
      emailVerified: true,
    });
    const [admin] = await db.select().from(roles).where(eq(roles.name, "Admin")).limit(1);
    await db.insert(userRoles).values({ userId: "officer", roleId: admin!.id });
    const [branch] = await db
      .insert(branches)
      .values({ name: "HQ", code: "HQ", timezone: "Africa/Addis_Ababa" })
      .returning();
    branchId = branch!.id;
    await db.insert(branchWorkingDays).values(
      [0, 1, 2, 3, 4].map((weekday) => ({
        branchId: branch!.id,
        weekday,
        isWorkingDay: true,
        openingTime: "09:00",
        closingTime: "17:00",
      })),
    );
  });

  it("counts the whole branch and filters by status server-side", async () => {
    const present = await seedEmployee(branchId, "PRESENT");
    const late = await seedEmployee(branchId, "LATE");
    // Third employee: nothing stored at all — a silent past working day.
    await seedEmployee(branchId, "SILENT");
    await db.insert(attendanceDays).values([
      { employeeId: present, attendanceDate: MONDAY, dayType: "working_day", outcome: "present" },
      {
        employeeId: late,
        attendanceDate: MONDAY,
        dayType: "working_day",
        outcome: "present",
        lateMinutes: 25,
      },
    ]);

    const all = await listDailyRegister(
      officer,
      listDailyRegisterInput.parse({ branchId, date: MONDAY, limit: 2 }),
    );
    // Counts cover the branch even though the page holds only two rows.
    expect(all.counts).toMatchObject({ present: 1, late: 1, absent: 1 });
    expect(all.total).toBe(3);
    expect(all.rows).toHaveLength(2);

    const absentees = await listDailyRegister(
      officer,
      listDailyRegisterInput.parse({ branchId, date: MONDAY, status: "absent" }),
    );
    expect(absentees.total).toBe(1);
    expect(absentees.rows.map((row) => row.employee.employeeCode)).toEqual(["SILENT"]);
    // The silent day is derived on read and lands as a stored absence.
    expect(absentees.rows[0]?.day).toMatchObject({ outcome: "absent" });
  });
});
