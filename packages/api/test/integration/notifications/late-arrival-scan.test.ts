import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import {
  attendanceDays,
  branches,
  branchWorkingDays,
  employees,
  holidays,
  notificationLog,
  notificationTiers,
  people,
  roles,
  user,
  userRoles,
} from "@UnifiedAttendance/db/schema/index";

import { createInnerContext, type Context } from "../../../src/context";
import type { Mailer } from "../../../src/mailer";
import { runLateArrivalScan } from "../../../src/modules/notifications/late-arrival-scan";
import { resetDatabase } from "../../fixtures";

// "Today" is pinned via fake timers (see beforeEach) to a Wednesday, so a
// Monday-Friday branch schedule gives a Monday week start and a stable
// window to seed a second occurrence into.
const TODAY = "2026-03-04";
const MONDAY_THIS_WEEK = "2026-03-02";

function fakeMailer(): { mailer: Mailer; sent: { to: string; subject: string; body: string }[] } {
  const sent: { to: string; subject: string; body: string }[] = [];
  return {
    sent,
    mailer: {
      send: vi.fn(async (input) => {
        sent.push(input);
      }),
    },
  };
}

function contextWith(mailer: Mailer): Context {
  return createInnerContext({ session: null, mailer });
}

async function seedBranchAndEmployee(
  options: { email?: string | null; name?: string; code?: string; employeeCode?: string } = {},
) {
  const [branch] = await db
    .insert(branches)
    .values({
      name: options.name ?? "Head Office",
      code: options.code ?? "HQ",
      timezone: "Africa/Addis_Ababa",
    })
    .returning();
  const branchId = branch!.id;

  await db.insert(branchWorkingDays).values(
    Array.from({ length: 7 }, (_, weekday) => ({
      branchId,
      weekday,
      isWorkingDay: weekday <= 4, // Monday-Friday; Saturday+Sunday off
      openingTime: weekday <= 4 ? "09:00:00" : null,
      closingTime: weekday <= 4 ? "17:00:00" : null,
    })),
  );

  const [person] = await db
    .insert(people)
    .values({
      firstName: "Abel",
      lastName: "Tesfaye",
      email: options.email === undefined ? "abel@example.test" : options.email,
    })
    .returning();

  const [employee] = await db
    .insert(employees)
    .values({
      personId: person!.id,
      branchId,
      employeeCode: options.employeeCode ?? "EMP-1",
      hireDate: "2024-01-01",
    })
    .returning();

  return { branchId, employeeId: employee!.id };
}

async function seedHrUser(id = "hr-user") {
  const email = `${id}@example.test`;
  await db.insert(user).values({ id, name: id, email, emailVerified: true }).onConflictDoNothing();
  const [role] = await db.select().from(roles).where(eq(roles.name, "HR")).limit(1);
  await db.insert(userRoles).values({ userId: id, roleId: role!.id }).onConflictDoNothing();
  return email;
}

/** `lateMinutes` must stay under 60 — it's used verbatim as the check-in minute. */
async function addLateAttendanceDay(
  employeeId: string,
  attendanceDate: string,
  lateMinutes: number,
) {
  await db.insert(attendanceDays).values({
    employeeId,
    attendanceDate,
    dayType: "working_day",
    outcome: "present",
    firstIn: new Date(`${attendanceDate}T09:${String(lateMinutes).padStart(2, "0")}:00+03:00`),
    lateMinutes,
  });
}

async function seedHoliday(options: { holidayDate: string; branchId?: string; name?: string }) {
  await db.insert(holidays).values({
    branchId: options.branchId ?? null,
    name: options.name ?? "NewYear",
    holidayDate: options.holidayDate,
  });
}

describe("runLateArrivalScan", () => {
  beforeEach(async () => {
    await resetDatabase();
    vi.useFakeTimers();
    // 11:00 local time in Africa/Addis_Ababa (UTC+3, no DST) on a Wednesday.
    vi.setSystemTime(new Date("2026-03-04T08:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("notifies the late employee and every HR user, using the matching tier's template", async () => {
    const { employeeId } = await seedBranchAndEmployee();
    const hrEmail = await seedHrUser();
    await addLateAttendanceDay(employeeId, TODAY, 15);
    const { mailer, sent } = fakeMailer();

    const summary = await runLateArrivalScan(contextWith(mailer));

    expect(summary).toEqual({ candidates: 1, notified: 1, skippedNoTier: 0, failed: 0 });
    expect(sent).toHaveLength(2);
    expect(sent.map((email) => email.to).sort()).toEqual([hrEmail, "abel@example.test"].sort());
    for (const email of sent) {
      expect(email.subject).toBe("Attendance Notice");
      expect(email.body).toBe(`Hi Abel Tesfaye, you were marked late on ${TODAY}.`);
    }

    const logRows = await db.select().from(notificationLog);
    expect(logRows).toHaveLength(1);
    expect(logRows[0]).toMatchObject({
      employeeId,
      attendanceDate: TODAY,
      condition: "late",
      occurrenceCount: 1,
    });
  });

  it("does not re-notify on a second scan pass (idempotent via notification_log)", async () => {
    const { employeeId } = await seedBranchAndEmployee();
    await seedHrUser();
    await addLateAttendanceDay(employeeId, TODAY, 15);
    const { mailer, sent } = fakeMailer();

    await runLateArrivalScan(contextWith(mailer));
    const secondSummary = await runLateArrivalScan(contextWith(mailer));

    expect(secondSummary).toEqual({ candidates: 0, notified: 0, skippedNoTier: 0, failed: 0 });
    expect(sent).toHaveLength(2); // only the first pass's sends
    expect(await db.select().from(notificationLog)).toHaveLength(1);
  });

  it("sends no late notice on an organisation-wide holiday", async () => {
    // The day is recorded as a working day with real lateness — the scan must
    // still stay silent, because the holiday says nobody was expected at all.
    const { employeeId } = await seedBranchAndEmployee();
    await seedHrUser();
    await addLateAttendanceDay(employeeId, TODAY, 15);
    await seedHoliday({ holidayDate: TODAY });
    const { mailer, sent } = fakeMailer();

    const summary = await runLateArrivalScan(contextWith(mailer));

    expect(summary).toEqual({ candidates: 0, notified: 0, skippedNoTier: 0, failed: 0 });
    expect(sent).toHaveLength(0);
    expect(await db.select().from(notificationLog)).toHaveLength(0);
  });

  it("silences only the branch a branch-scoped holiday names", async () => {
    // Both employees are late; only the branch named by the holiday stays quiet.
    const head = await seedBranchAndEmployee();
    const regional = await seedBranchAndEmployee({
      name: "Bahir Dar",
      code: "BDR",
      email: "sara@example.test",
      employeeCode: "EMP-2",
    });
    await seedHrUser();
    await addLateAttendanceDay(head.employeeId, TODAY, 15);
    await addLateAttendanceDay(regional.employeeId, TODAY, 15);
    await seedHoliday({
      holidayDate: TODAY,
      branchId: regional.branchId,
      name: "Branch Rest Day",
    });
    const { mailer, sent } = fakeMailer();

    const summary = await runLateArrivalScan(contextWith(mailer));

    expect(summary).toEqual({ candidates: 1, notified: 1, skippedNoTier: 0, failed: 0 });
    expect(sent.map((email) => email.to)).toContain("abel@example.test");
    expect(sent.map((email) => email.to)).not.toContain("sara@example.test");

    const logRows = await db.select().from(notificationLog);
    expect(logRows).toHaveLength(1);
    expect(logRows[0]).toMatchObject({ employeeId: head.employeeId, condition: "late" });
  });

  it("skips an employee already notified before the scan runs", async () => {
    const { employeeId } = await seedBranchAndEmployee();
    await seedHrUser();
    await addLateAttendanceDay(employeeId, TODAY, 15);
    await db.insert(notificationLog).values({
      employeeId,
      attendanceDate: TODAY,
      condition: "late",
      occurrenceCount: 1,
    });
    const { mailer, sent } = fakeMailer();

    const summary = await runLateArrivalScan(contextWith(mailer));

    expect(summary).toEqual({ candidates: 0, notified: 0, skippedNoTier: 0, failed: 0 });
    expect(sent).toHaveLength(0);
  });

  it("counts this week's late occurrences (including today) and picks the matching tier", async () => {
    const { employeeId } = await seedBranchAndEmployee();
    await seedHrUser();
    await addLateAttendanceDay(employeeId, MONDAY_THIS_WEEK, 5);
    await addLateAttendanceDay(employeeId, TODAY, 20);
    await db.insert(notificationTiers).values({
      condition: "late",
      threshold: 2,
      subjectTemplate: "Second Late Notice",
      bodyTemplate:
        "{{employeeName}} was {{lateMinutes}}m late at {{branchName}} on {{date}} " +
        "(#{{occurrenceCount}} this week).",
    });
    const { mailer, sent } = fakeMailer();

    const summary = await runLateArrivalScan(contextWith(mailer));

    expect(summary).toMatchObject({ candidates: 1, notified: 1 });
    expect(sent[0]?.subject).toBe("Second Late Notice");
    expect(sent[0]?.body).toBe(
      `Abel Tesfaye was 20m late at Head Office on ${TODAY} (#2 this week).`,
    );

    const [logRow] = await db.select().from(notificationLog);
    expect(logRow).toMatchObject({ occurrenceCount: 2 });
  });

  it("skips without crashing, and without logging, when no tier matches", async () => {
    const { employeeId } = await seedBranchAndEmployee();
    await seedHrUser();
    await addLateAttendanceDay(employeeId, TODAY, 15);
    await db.delete(notificationTiers).where(eq(notificationTiers.condition, "late"));
    const { mailer, sent } = fakeMailer();

    const summary = await runLateArrivalScan(contextWith(mailer));

    expect(summary).toEqual({ candidates: 1, notified: 0, skippedNoTier: 1, failed: 0 });
    expect(sent).toHaveLength(0);
    expect(await db.select().from(notificationLog)).toHaveLength(0);
  });

  it("skips a late employee's own email when null, without failing the scan", async () => {
    const { employeeId } = await seedBranchAndEmployee({ email: null });
    const hrEmail = await seedHrUser();
    await addLateAttendanceDay(employeeId, TODAY, 15);
    const { mailer, sent } = fakeMailer();

    const summary = await runLateArrivalScan(contextWith(mailer));

    expect(summary).toEqual({ candidates: 1, notified: 1, skippedNoTier: 0, failed: 0 });
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe(hrEmail);
  });

  it("does nothing and returns a zeroed summary when nobody is late today", async () => {
    await seedBranchAndEmployee();
    await seedHrUser();
    const { mailer, sent } = fakeMailer();

    const summary = await runLateArrivalScan(contextWith(mailer));

    expect(summary).toEqual({ candidates: 0, notified: 0, skippedNoTier: 0, failed: 0 });
    expect(sent).toHaveLength(0);
  });
});
