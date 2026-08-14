import { beforeEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import {
  attendanceDays,
  branches,
  branchWorkingDays,
  departments,
  employees,
  employmentPeriods,
  holidays,
  people,
  roles,
  user,
  userRoles,
} from "@UnifiedAttendance/db/schema/index";

import { listDailyRegister } from "../../../src/modules/attendance/service";
import { getAttendanceSummary } from "../../../src/modules/reports/service";
import { attendanceSummaryInput } from "../../../src/validations/reports";
import { resetDatabase, testContext } from "../../fixtures";

const officer = testContext("officer");

// The same fixed week the weekday-alignment tests use: 2026-03-02 is a Monday.
const MON = "2026-03-02";
const TUE = "2026-03-03";
const WED = "2026-03-04";
const THU = "2026-03-05";
const FRI = "2026-03-06";
const SUN = "2026-03-08";

async function seedUser(id: string, roleName: string) {
  await db
    .insert(user)
    .values({ id, name: id, email: `${id}@example.test`, emailVerified: true })
    .onConflictDoNothing();
  const [role] = await db.select().from(roles).where(eq(roles.name, roleName)).limit(1);
  await db.insert(userRoles).values({ userId: id, roleId: role!.id });
}

/** A branch working the given Monday-first weekdays, tracked since before the fixture dates. */
async function seedBranch(name: string, workingWeekdays: number[], createdAt = "2025-01-01") {
  const [branch] = await db
    .insert(branches)
    .values({
      name,
      code: name,
      timezone: "Africa/Addis_Ababa",
      createdAt: new Date(`${createdAt}T00:00:00Z`),
    })
    .returning();
  await db.insert(branchWorkingDays).values(
    [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
      branchId: branch!.id,
      weekday,
      isWorkingDay: workingWeekdays.includes(weekday),
      openingTime: workingWeekdays.includes(weekday) ? "09:00" : null,
      closingTime: workingWeekdays.includes(weekday) ? "17:00" : null,
    })),
  );
  return branch!.id;
}

async function seedEmployee(options: {
  code: string;
  branchId: string;
  departmentId?: string;
  from?: string;
  to?: string | null;
  status?: "active" | "suspended" | "terminated";
  fixedSchedule?: boolean;
}) {
  const [person] = await db
    .insert(people)
    .values({ firstName: options.code, lastName: "Test" })
    .returning();
  const [employee] = await db
    .insert(employees)
    .values({
      personId: person!.id,
      branchId: options.branchId,
      employeeCode: options.code,
      hireDate: options.from ?? "2025-01-01",
      hasFixedSchedule: options.fixedSchedule ?? true,
    })
    .returning();
  await db.insert(employmentPeriods).values({
    employeeId: employee!.id,
    branchId: options.branchId,
    departmentId: options.departmentId,
    effectiveFrom: options.from ?? "2025-01-01",
    effectiveTo: options.to ?? null,
    status: options.status ?? "active",
  });
  return employee!.id;
}

function day(
  employeeId: string,
  attendanceDate: string,
  outcome: "present" | "partial" | "absent" | "unknown",
  extras: Partial<typeof attendanceDays.$inferInsert> = {},
) {
  return db.insert(attendanceDays).values({
    employeeId,
    attendanceDate,
    dayType: "working_day",
    outcome,
    ...extras,
  });
}

function summary(input: Record<string, unknown>) {
  return getAttendanceSummary(officer, attendanceSummaryInput.parse(input));
}

describe("attendance summary report", () => {
  beforeEach(async () => {
    await resetDatabase();
    await seedUser("officer", "Admin");
  });

  it("starts tracking on the day the branch entered the system, not on Monday", async () => {
    // Installed on Wednesday: Monday and Tuesday were never tracked.
    const branchId = await seedBranch("HQ", [0, 1, 2, 3, 4], WED);
    const employeeId = await seedEmployee({ code: "EMP-1", branchId, from: "2025-06-01" });
    await day(employeeId, WED, "present", { workedMinutes: 480 });
    await day(employeeId, THU, "present", { workedMinutes: 480 });

    const report = await summary({ from: MON, to: SUN });

    expect(report.rows[0]).toMatchObject({
      expectedDays: 3, // Wednesday through Friday only
      presentDays: 2,
      absentDays: 1, // Friday stayed silent; Monday and Tuesday must not count
    });
  });

  it("counts a full Monday-to-Friday week, reading silence before today as absence", async () => {
    const branchId = await seedBranch("HQ", [0, 1, 2, 3, 4]);
    const employeeId = await seedEmployee({ code: "EMP-1", branchId });
    await day(employeeId, MON, "present", { workedMinutes: 480 });
    await day(employeeId, TUE, "present", { lateMinutes: 20, workedMinutes: 460 });
    await day(employeeId, WED, "absent");
    // Thursday: nothing recorded at all — the report must read it as absent.
    await day(employeeId, FRI, "partial", { missingCheckOut: true });

    const report = await summary({ from: MON, to: SUN });

    expect(report.total).toBe(1);
    expect(report.rows[0]).toMatchObject({
      expectedDays: 5, // Saturday and Sunday are not working days
      presentDays: 2,
      partialDays: 1,
      lateDays: 1,
      lateMinutes: 20,
      absentDays: 2, // stored Wednesday + silent Thursday
      unrecordedDays: 0,
      missingPunchDays: 1,
      workedMinutes: 940,
      attendanceRatePercent: 60,
      punctualityRatePercent: 50,
    });
    expect(report.totals.employees).toBe(1);
    expect(report.totals.absentDays).toBe(2);

    // The same week folded by day, for the charts.
    expect(report.byDay).toHaveLength(5);
    expect(report.byDay[0]).toMatchObject({ date: MON, onTime: 1 });
    expect(report.byDay[1]).toMatchObject({ date: TUE, late: 1, onTime: 0 });
    expect(report.byDay[3]).toMatchObject({ date: THU, absent: 1 });
  });

  it("does not count a manually marked present day as missing a punch", async () => {
    // A branch with no device: staff are marked present by hand, so the day
    // never gets a check-in or check-out timestamp — that is expected, not
    // an exception to flag.
    const branchId = await seedBranch("Manual Branch", [0, 1, 2, 3, 4]);
    const employeeId = await seedEmployee({ code: "EMP-2", branchId });
    await day(employeeId, MON, "present", { missingCheckIn: true, missingCheckOut: true });
    await day(employeeId, TUE, "absent", { missingCheckIn: true, missingCheckOut: true });

    const report = await summary({ from: MON, to: TUE });

    expect(report.rows[0]).toMatchObject({
      presentDays: 1,
      absentDays: 1,
      missingPunchDays: 0,
    });
  });

  it("removes branch, global, and doubly-listed holidays exactly once", async () => {
    const branchId = await seedBranch("HQ", [0, 1, 2, 3, 4]);
    await seedEmployee({ code: "EMP-1", branchId });
    await db.insert(holidays).values([
      { branchId, name: "Branch day", holidayDate: MON },
      { branchId: null, name: "National day", holidayDate: TUE },
      { branchId, name: "Local fete", holidayDate: WED },
      { branchId: null, name: "Global fete", holidayDate: WED },
    ]);

    const report = await summary({ from: MON, to: SUN });

    // Only Thursday and Friday remain expected.
    expect(report.rows[0]?.expectedDays).toBe(2);
  });

  it("bounds expectations by the employment period and skips suspended staff", async () => {
    const branchId = await seedBranch("HQ", [0, 1, 2, 3, 4]);
    await seedEmployee({ code: "MID-HIRE", branchId, from: WED });
    await seedEmployee({ code: "LEAVER", branchId, from: "2025-01-01", to: TUE });
    await seedEmployee({ code: "SUSPENDED", branchId, status: "suspended" });

    const report = await summary({ from: MON, to: SUN });

    const byCode = new Map(report.rows.map((row) => [row.employee.employeeCode, row]));
    expect(byCode.get("MID-HIRE")?.expectedDays).toBe(3); // Wed, Thu, Fri
    expect(byCode.get("LEAVER")?.expectedDays).toBe(2); // Mon, Tue
    expect(byCode.has("SUSPENDED")).toBe(false);
    expect(report.total).toBe(2);
  });

  it("treats today's silence as unrecorded, but a stored absence today as absent", async () => {
    // A branch that works every day, so this holds on any real-world weekday.
    const branchId = await seedBranch("ALLWEEK", [0, 1, 2, 3, 4, 5, 6]);
    await seedEmployee({ code: "SILENT", branchId });
    const marked = await seedEmployee({ code: "MARKED", branchId });
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(
      new Date(),
    );
    await day(marked, today, "absent");

    const report = await summary({ from: today, to: today });

    const byCode = new Map(report.rows.map((row) => [row.employee.employeeCode, row]));
    expect(byCode.get("SILENT")).toMatchObject({
      expectedDays: 1,
      unrecordedDays: 1,
      absentDays: 0,
    });
    expect(byCode.get("MARKED")).toMatchObject({ expectedDays: 1, absentDays: 1 });
  });

  it("keeps today's silence unrecorded even after the register has been opened", async () => {
    const branchId = await seedBranch("ALLWEEK", [0, 1, 2, 3, 4, 5, 6]);
    await seedEmployee({ code: "SILENT", branchId });
    const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(
      new Date(),
    );

    // The register derives days for silent employees; that must not store one.
    await listDailyRegister(officer, { branchId, date: today, limit: 10, offset: 0 });
    const report = await summary({ from: today, to: today });

    expect(report.rows[0]).toMatchObject({ expectedDays: 1, unrecordedDays: 1, absentDays: 0 });
  });

  it("counts a flexible employee only on the days they actually came", async () => {
    const branchId = await seedBranch("HQ", [0, 1, 2, 3, 4]);
    const flexible = await seedEmployee({ code: "FLEX", branchId, fixedSchedule: false });
    await day(flexible, TUE, "present", { workedMinutes: 300 });

    const report = await summary({ from: MON, to: SUN });

    expect(report.rows[0]).toMatchObject({
      expectedDays: 1, // only Tuesday, the day they came
      presentDays: 1,
      workedMinutes: 300,
      absentDays: 0,
      unrecordedDays: 0,
    });
  });

  it("keeps the weekday alignment: a Friday-only branch expects Friday, not Saturday", async () => {
    const branchId = await seedBranch("FRIDAYS", [4]);
    const employeeId = await seedEmployee({ code: "EMP-1", branchId });
    await day(employeeId, FRI, "present");

    const report = await summary({ from: MON, to: SUN });

    expect(report.rows[0]).toMatchObject({ expectedDays: 1, presentDays: 1, absentDays: 0 });
  });

  it("does not double-count days under overlapping employment periods", async () => {
    const branchId = await seedBranch("HQ", [0, 1, 2, 3, 4]);
    const employeeId = await seedEmployee({ code: "EMP-1", branchId, from: "2025-01-01", to: SUN });
    await db.insert(employmentPeriods).values({
      employeeId,
      branchId,
      effectiveFrom: "2025-06-01",
      effectiveTo: "2026-12-31",
      status: "active",
    });

    const report = await summary({ from: MON, to: SUN });

    expect(report.rows[0]?.expectedDays).toBe(5);
  });

  it("follows a mid-week transfer day by day and labels with the newest period", async () => {
    const branchA = await seedBranch("A", [0, 1, 2, 3, 4]);
    const branchB = await seedBranch("B", [0, 1, 2, 3, 4]);
    const employeeId = await seedEmployee({ code: "MOVER", branchId: branchA, to: TUE });
    await db.insert(employmentPeriods).values({
      employeeId,
      branchId: branchB,
      effectiveFrom: WED,
      status: "active",
    });

    const everywhere = await summary({ from: MON, to: SUN });
    expect(everywhere.rows[0]).toMatchObject({ expectedDays: 5, branch: { id: branchB } });

    const onlyA = await summary({ from: MON, to: SUN, branchId: branchA });
    expect(onlyA.rows[0]?.expectedDays).toBe(2); // the days actually worked under A
  });

  it("filters by department and matches search against name and code", async () => {
    const branchId = await seedBranch("HQ", [0, 1, 2, 3, 4]);
    const [ops] = await db.insert(departments).values({ name: "Operations" }).returning();
    await seedEmployee({ code: "IN-DEPT", branchId, departmentId: ops!.id });
    await seedEmployee({ code: "NO-DEPT", branchId });

    const filtered = await summary({ from: MON, to: SUN, departmentId: ops!.id });
    expect(filtered.rows.map((row) => row.employee.employeeCode)).toEqual(["IN-DEPT"]);

    const searched = await summary({ from: MON, to: SUN, search: "no-dept" });
    expect(searched.rows.map((row) => row.employee.employeeCode)).toEqual(["NO-DEPT"]);
    expect(searched.total).toBe(1);
  });

  it("sorts worst-first and paginates with a stable total", async () => {
    const branchId = await seedBranch("HQ", [0, 1, 2, 3, 4]);
    const punctual = await seedEmployee({ code: "PUNCTUAL", branchId });
    const late = await seedEmployee({ code: "LATE", branchId });
    for (const date of [MON, TUE, WED, THU, FRI]) {
      await day(punctual, date, "present");
      await day(late, date, "present", { lateMinutes: 15 });
    }

    const sorted = await summary({ from: MON, to: SUN, sort: "lateDays" });
    expect(sorted.rows.map((row) => row.employee.employeeCode)).toEqual(["LATE", "PUNCTUAL"]);

    const page = await summary({ from: MON, to: SUN, sort: "lateDays", limit: 1, offset: 1 });
    expect(page.rows.map((row) => row.employee.employeeCode)).toEqual(["PUNCTUAL"]);
    expect(page.total).toBe(2);
    expect(page.totals.lateDays).toBe(5); // totals cover the whole set, not the page
  });

  it("is open to HR and closed to Manager", async () => {
    const branchId = await seedBranch("HQ", [0, 1, 2, 3, 4]);
    await seedEmployee({ code: "EMP-1", branchId });
    await seedUser("hr-user", "HR");
    await seedUser("manager-user", "Manager");

    const input = attendanceSummaryInput.parse({ from: MON, to: SUN });
    await expect(getAttendanceSummary(testContext("hr-user"), input)).resolves.toMatchObject({
      total: 1,
    });
    await expect(getAttendanceSummary(testContext("manager-user"), input)).rejects.toThrow();
  });

  it("rejects a backwards or over-long range", () => {
    expect(attendanceSummaryInput.safeParse({ from: TUE, to: MON }).success).toBe(false);
    expect(attendanceSummaryInput.safeParse({ from: "2026-01-01", to: "2026-06-01" }).success).toBe(
      false,
    );
    expect(attendanceSummaryInput.safeParse({ from: MON, to: MON }).success).toBe(true);
  });
});
