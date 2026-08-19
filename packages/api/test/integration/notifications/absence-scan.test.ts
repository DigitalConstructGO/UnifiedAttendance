import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import {
  attendanceCorrections,
  attendanceDevices,
  attendanceEvents,
  branches,
  branchWorkingDays,
  employees,
  employmentPeriods,
  manualAttendanceEntries,
  notificationLog,
  notificationTiers,
  people,
  roles,
  user,
  userRoles,
} from "@UnifiedAttendance/db/schema/index";

import { createInnerContext, type Context } from "../../../src/context";
import type { Mailer } from "../../../src/mailer";
import { runAbsenceScan } from "../../../src/modules/notifications/absence-scan";
import { resetDatabase } from "../../fixtures";

const TIMEZONE = "Africa/Addis_Ababa"; // UTC+3, no DST — keeps the arithmetic below simple.
// "Today" is pinned via fake timers to a Wednesday (see beforeEach), so a
// Monday-Friday branch schedule gives a Monday week start, matching the
// late-arrival scan's tests for the same reason.
const TODAY = "2026-03-04";
const MONDAY_THIS_WEEK = "2026-03-02";
const TUESDAY_THIS_WEEK = "2026-03-03";

// 18:00 local time — well past the 17:00 close plus the 15-minute
// confirmation buffer, so the branch's shift reads as settled.
const SETTLED_TIME = new Date("2026-03-04T15:00:00Z");
// 11:00 local time — before the 17:00 close, so the shift is still open.
const UNSETTLED_TIME = new Date("2026-03-04T08:00:00Z");

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

/** weekday: Monday-first (0=Monday..6=Sunday), matching `branchWorkingDays.weekday`. */
async function seedBranch(options: { closedWeekdays?: number[] } = {}) {
  const closed = new Set(options.closedWeekdays ?? [5, 6]); // default: Saturday+Sunday off
  const [branch] = await db
    .insert(branches)
    .values({ name: "Head Office", code: "HQ", timezone: TIMEZONE })
    .returning();
  const branchId = branch!.id;

  await db.insert(branchWorkingDays).values(
    Array.from({ length: 7 }, (_, weekday) => {
      const isWorkingDay = !closed.has(weekday);
      return {
        branchId,
        weekday,
        isWorkingDay,
        openingTime: isWorkingDay ? "09:00:00" : null,
        closingTime: isWorkingDay ? "17:00:00" : null,
      };
    }),
  );

  return branchId;
}

async function seedEmployee(
  branchId: string,
  options: { email?: string | null; code?: string } = {},
) {
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
      employeeCode: options.code ?? "EMP-1",
      hireDate: "2024-01-01",
    })
    .returning();
  const employeeId = employee!.id;

  await db.insert(employmentPeriods).values({
    employeeId,
    branchId,
    effectiveFrom: "2024-01-01",
    status: "active",
  });

  return employeeId;
}

async function seedHrUser(id = "hr-user") {
  const email = `${id}@example.test`;
  await db.insert(user).values({ id, name: id, email, emailVerified: true }).onConflictDoNothing();
  const [role] = await db.select().from(roles).where(eq(roles.name, "HR")).limit(1);
  await db.insert(userRoles).values({ userId: id, roleId: role!.id }).onConflictDoNothing();
  return email;
}

async function seedOfficer() {
  const id = "officer";
  await db
    .insert(user)
    .values({ id, name: "Officer", email: "officer@example.test", emailVerified: true })
    .onConflictDoNothing();
  return id;
}

async function addEvent(branchId: string, employeeId: string, occurredAt: string) {
  const [device] = await db
    .insert(attendanceDevices)
    .values({ branchId, name: "Entrance", serialNumber: `SN-${employeeId}` })
    .returning();
  await db.insert(attendanceEvents).values({
    deviceId: device!.id,
    employeeId,
    deviceIdentityNumber: "1001",
    occurredAt: new Date(occurredAt),
    direction: "in",
  });
}

async function addManualEntry(employeeId: string, attendanceDate: string) {
  const officerId = await seedOfficer();
  await db.insert(manualAttendanceEntries).values({
    employeeId,
    attendanceDate,
    kind: "mark_present",
    reason: "Confirmed present by phone",
    createdBy: officerId,
  });
}

async function addCorrection(employeeId: string, attendanceDate: string) {
  const officerId = await seedOfficer();
  await db.insert(attendanceCorrections).values({
    employeeId,
    attendanceDate,
    type: "mark_present",
    reason: "Verified with the supervisor",
    appliedBy: officerId,
  });
}

async function seedAbsentLog(employeeId: string, attendanceDate: string) {
  const [tier] = await db
    .select()
    .from(notificationTiers)
    .where(eq(notificationTiers.condition, "absent"))
    .limit(1);
  await db.insert(notificationLog).values({
    employeeId,
    attendanceDate,
    condition: "absent",
    occurrenceCount: 1,
    tierId: tier?.id,
  });
}

describe("runAbsenceScan", () => {
  beforeEach(async () => {
    await resetDatabase();
    vi.useFakeTimers();
    vi.setSystemTime(SETTLED_TIME);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("notifies a true no-show and every HR user, once the shift has settled", async () => {
    const branchId = await seedBranch();
    const employeeId = await seedEmployee(branchId);
    const hrEmail = await seedHrUser();
    const { mailer, sent } = fakeMailer();

    const summary = await runAbsenceScan(contextWith(mailer));

    expect(summary).toEqual({ candidates: 1, notified: 1, skippedNoTier: 0, failed: 0 });
    expect(sent).toHaveLength(2);
    expect(sent.map((email) => email.to).sort()).toEqual([hrEmail, "abel@example.test"].sort());
    for (const email of sent) {
      expect(email.subject).toBe("Attendance Notice");
      expect(email.body).toBe(`Hi Abel Tesfaye, you were marked absent on ${TODAY}.`);
    }

    const logRows = await db.select().from(notificationLog);
    expect(logRows).toHaveLength(1);
    expect(logRows[0]).toMatchObject({
      employeeId,
      attendanceDate: TODAY,
      condition: "absent",
      occurrenceCount: 1,
    });
  });

  it("does not flag an employee who punched in, even if late", async () => {
    const branchId = await seedBranch();
    const employeeId = await seedEmployee(branchId);
    await seedHrUser();
    await addEvent(branchId, employeeId, `${TODAY}T09:20:00+03:00`);
    const { mailer, sent } = fakeMailer();

    const summary = await runAbsenceScan(contextWith(mailer));

    expect(summary).toEqual({ candidates: 0, notified: 0, skippedNoTier: 0, failed: 0 });
    expect(sent).toHaveLength(0);
  });

  it("does not flag an employee with a manual entry for today", async () => {
    const branchId = await seedBranch();
    const employeeId = await seedEmployee(branchId);
    await seedHrUser();
    await addManualEntry(employeeId, TODAY);
    const { mailer, sent } = fakeMailer();

    const summary = await runAbsenceScan(contextWith(mailer));

    expect(summary).toEqual({ candidates: 0, notified: 0, skippedNoTier: 0, failed: 0 });
    expect(sent).toHaveLength(0);
  });

  it("does not flag an employee with a correction for today", async () => {
    const branchId = await seedBranch();
    const employeeId = await seedEmployee(branchId);
    await seedHrUser();
    await addCorrection(employeeId, TODAY);
    const { mailer, sent } = fakeMailer();

    const summary = await runAbsenceScan(contextWith(mailer));

    expect(summary).toEqual({ candidates: 0, notified: 0, skippedNoTier: 0, failed: 0 });
    expect(sent).toHaveLength(0);
  });

  it("skips a branch entirely whose shift hasn't ended yet", async () => {
    vi.setSystemTime(UNSETTLED_TIME);
    const branchId = await seedBranch();
    await seedEmployee(branchId);
    await seedHrUser();
    const { mailer, sent } = fakeMailer();

    const summary = await runAbsenceScan(contextWith(mailer));

    expect(summary).toEqual({ candidates: 0, notified: 0, skippedNoTier: 0, failed: 0 });
    expect(sent).toHaveLength(0);
  });

  it("skips a branch entirely on a non-working day", async () => {
    // Wednesday (weekday 2) marked as a rest day for this branch.
    const branchId = await seedBranch({ closedWeekdays: [2, 5, 6] });
    await seedEmployee(branchId);
    await seedHrUser();
    const { mailer, sent } = fakeMailer();

    const summary = await runAbsenceScan(contextWith(mailer));

    expect(summary).toEqual({ candidates: 0, notified: 0, skippedNoTier: 0, failed: 0 });
    expect(sent).toHaveLength(0);
  });

  it("does not re-notify on a second scan pass (idempotent via notification_log)", async () => {
    const branchId = await seedBranch();
    await seedEmployee(branchId);
    await seedHrUser();
    const { mailer, sent } = fakeMailer();

    await runAbsenceScan(contextWith(mailer));
    const secondSummary = await runAbsenceScan(contextWith(mailer));

    expect(secondSummary).toEqual({ candidates: 0, notified: 0, skippedNoTier: 0, failed: 0 });
    expect(sent).toHaveLength(2); // only the first pass's sends
    expect(await db.select().from(notificationLog)).toHaveLength(1);
  });

  it("escalates the weekly occurrence count using prior notification_log rows", async () => {
    const branchId = await seedBranch();
    const employeeId = await seedEmployee(branchId);
    await seedHrUser();
    // Simulate two prior logged absences earlier this week (Monday, Tuesday)
    // — this scan counts from notification_log, not re-derived history.
    await seedAbsentLog(employeeId, MONDAY_THIS_WEEK);
    await seedAbsentLog(employeeId, TUESDAY_THIS_WEEK);
    await db.insert(notificationTiers).values({
      condition: "absent",
      threshold: 3,
      subjectTemplate: "Third Absence Notice",
      bodyTemplate: "{{employeeName}} at {{branchName}} was absent on {{date}} (#{{occurrenceCount}} this week).",
    });
    const { mailer, sent } = fakeMailer();

    const summary = await runAbsenceScan(contextWith(mailer));

    expect(summary).toMatchObject({ candidates: 1, notified: 1 });
    expect(sent[0]?.subject).toBe("Third Absence Notice");
    expect(sent[0]?.body).toBe(
      `Abel Tesfaye at Head Office was absent on ${TODAY} (#3 this week).`,
    );

    const [logRow] = await db
      .select()
      .from(notificationLog)
      .where(eq(notificationLog.attendanceDate, TODAY));
    expect(logRow).toMatchObject({ occurrenceCount: 3 });
  });

  it("skips without crashing, and without logging, when no tier matches", async () => {
    const branchId = await seedBranch();
    await seedEmployee(branchId);
    await seedHrUser();
    await db.delete(notificationTiers).where(eq(notificationTiers.condition, "absent"));
    const { mailer, sent } = fakeMailer();

    const summary = await runAbsenceScan(contextWith(mailer));

    expect(summary).toEqual({ candidates: 1, notified: 0, skippedNoTier: 1, failed: 0 });
    expect(sent).toHaveLength(0);
    expect(await db.select().from(notificationLog)).toHaveLength(0);
  });

  it("skips an absent employee's own email when null, without failing the scan", async () => {
    const branchId = await seedBranch();
    await seedEmployee(branchId, { email: null });
    const hrEmail = await seedHrUser();
    const { mailer, sent } = fakeMailer();

    const summary = await runAbsenceScan(contextWith(mailer));

    expect(summary).toEqual({ candidates: 1, notified: 1, skippedNoTier: 0, failed: 0 });
    expect(sent).toHaveLength(1);
    expect(sent[0]?.to).toBe(hrEmail);
  });

  it("does nothing and returns a zeroed summary when there are no branches or employees", async () => {
    const { mailer, sent } = fakeMailer();

    const summary = await runAbsenceScan(contextWith(mailer));

    expect(summary).toEqual({ candidates: 0, notified: 0, skippedNoTier: 0, failed: 0 });
    expect(sent).toHaveLength(0);
  });
});
