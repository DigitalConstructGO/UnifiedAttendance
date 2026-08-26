import { and, asc, eq, exists, gte, isNull, lt, lte, not, or, sql } from "drizzle-orm";

import {
  attendanceCorrections,
  attendanceEvents,
  branches,
  branchWorkingDays,
  employees,
  employmentPeriods,
  manualAttendanceEntries,
  notificationLog,
  notificationTiers,
  people,
} from "@UnifiedAttendance/db/schema/index";
import { EMPLOYEE_STATUSES } from "@UnifiedAttendance/db/schema/workforce-enums";

import { loadBranchesOnHoliday, mondayFirstWeekday } from "../../attendance/day-context";
import { dayExpectation } from "../../attendance/day-expectation";
import { loadBranchToday } from "../reports/expected-days";
import { loadHrEmails, resolveNotificationRecipients } from "./recipients";
import { renderTemplate, type TemplateValues } from "./render-template";
import { resolveNotificationTier } from "./resolve-tier";
import { deriveWeekStartWeekday, weekWindowFor, type WorkingDayFlag } from "./week-window";

import type { Context } from "../../context";

const CONDITION = "absent" as const;

const ABSENCE_CONFIRMATION_BUFFER_MS = 15 * 60_000;

type QualifyingBranch = {
  branchId: string;
  branchName: string;
  attendanceDate: string;
  dayStart: Date;
  dayEnd: Date;
  /** Kept per branch so the weekly occurrence count can derive its own week start. */
  workingDays: WorkingDayFlag[];
};

type AbsenceCandidate = {
  employeeId: string;
  branchId: string;
  branchName: string;
  attendanceDate: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string | null;
};

export type AbsenceScanSummary = {
  candidates: number;
  notified: number;
  skippedNoTier: number;
  failed: number;
};

export async function runAbsenceScan(ctx: Context): Promise<AbsenceScanSummary> {
  const qualifyingBranches = await loadQualifyingBranches(ctx);
  const [candidates, tiers, hrEmails] = await Promise.all([
    findAbsenceCandidates(ctx, qualifyingBranches),
    loadAbsentTiers(ctx),
    loadHrEmails(ctx),
  ]);

  const summary: AbsenceScanSummary = {
    candidates: candidates.length,
    notified: 0,
    skippedNoTier: 0,
    failed: 0,
  };

  for (const candidate of candidates) {
    try {
      const notified = await processCandidate(ctx, candidate, tiers, hrEmails);
      if (notified) summary.notified += 1;
      else summary.skippedNoTier += 1;
    } catch (error) {
      summary.failed += 1;
      console.error(
        `[absence-scan] failed to process employee ${candidate.employeeId} ` +
          `on ${candidate.attendanceDate}:`,
        error,
      );
    }
  }

  return summary;
}

async function loadQualifyingBranches(ctx: Context): Promise<QualifyingBranch[]> {
  const branchToday = await loadBranchToday(ctx);
  const branchesOnHoliday = await loadBranchesOnHoliday(ctx, branchToday);

  const activeBranches = await ctx.db
    .select({ id: branches.id, name: branches.name, timezone: branches.timezone })
    .from(branches)
    .where(isNull(branches.archivedAt));

  const now = Date.now();
  const qualifying: QualifyingBranch[] = [];

  for (const branch of activeBranches) {
    const attendanceDate = branchToday.get(branch.id);
    if (!attendanceDate) continue;

    const workingDays = await ctx.db
      .select({
        weekday: branchWorkingDays.weekday,
        isWorkingDay: branchWorkingDays.isWorkingDay,
        openingTime: branchWorkingDays.openingTime,
        closingTime: branchWorkingDays.closingTime,
      })
      .from(branchWorkingDays)
      .where(eq(branchWorkingDays.branchId, branch.id));

    // Nobody can be absent from a day nothing was owed on — a rest day or a
    // holiday — and a working day only settles once its shift has closed.
    const weekday = mondayFirstWeekday(attendanceDate);
    const expectation = dayExpectation({
      attendanceDate,
      timezone: branch.timezone,
      workingDay: workingDays.find((day) => day.weekday === weekday) ?? null,
      holiday: branchesOnHoliday.get(branch.id) ?? null,
    });
    if (expectation.dayType !== "working_day" || !expectation.expectedEnd) continue;
    if (now < expectation.expectedEnd.getTime() + ABSENCE_CONFIRMATION_BUFFER_MS) continue;

    qualifying.push({
      branchId: branch.id,
      branchName: branch.name,
      attendanceDate,
      dayStart: expectation.dayStart,
      dayEnd: expectation.dayEnd,
      workingDays,
    });
  }

  return qualifying;
}

async function findAbsenceCandidates(
  ctx: Context,
  qualifyingBranches: QualifyingBranch[],
): Promise<AbsenceCandidate[]> {
  const candidates: AbsenceCandidate[] = [];

  for (const branch of qualifyingBranches) {
    const rows = await ctx.db
      .select({
        employeeId: employees.id,
        firstName: people.firstName,
        middleName: people.middleName,
        lastName: people.lastName,
        email: people.email,
      })
      .from(employmentPeriods)
      .innerJoin(employees, eq(employmentPeriods.employeeId, employees.id))
      .innerJoin(people, eq(employees.personId, people.id))
      .where(
        and(
          eq(employmentPeriods.branchId, branch.branchId),
          eq(employmentPeriods.status, EMPLOYEE_STATUSES[0]),
          isNull(employees.archivedAt),
          eq(employees.hasFixedSchedule, true),
          lte(employmentPeriods.effectiveFrom, branch.attendanceDate),
          or(
            isNull(employmentPeriods.effectiveTo),
            gte(employmentPeriods.effectiveTo, branch.attendanceDate),
          ),
          not(
            exists(
              ctx.db
                .select({ one: sql`1` })
                .from(attendanceEvents)
                .where(
                  and(
                    eq(attendanceEvents.employeeId, employees.id),
                    gte(attendanceEvents.occurredAt, branch.dayStart),
                    lt(attendanceEvents.occurredAt, branch.dayEnd),
                  ),
                ),
            ),
          ),
          not(
            exists(
              ctx.db
                .select({ one: sql`1` })
                .from(manualAttendanceEntries)
                .where(
                  and(
                    eq(manualAttendanceEntries.employeeId, employees.id),
                    eq(manualAttendanceEntries.attendanceDate, branch.attendanceDate),
                  ),
                ),
            ),
          ),
          not(
            exists(
              ctx.db
                .select({ one: sql`1` })
                .from(attendanceCorrections)
                .where(
                  and(
                    eq(attendanceCorrections.employeeId, employees.id),
                    eq(attendanceCorrections.attendanceDate, branch.attendanceDate),
                  ),
                ),
            ),
          ),
          not(
            exists(
              ctx.db
                .select({ one: sql`1` })
                .from(notificationLog)
                .where(
                  and(
                    eq(notificationLog.employeeId, employees.id),
                    eq(notificationLog.attendanceDate, branch.attendanceDate),
                    eq(notificationLog.condition, CONDITION),
                  ),
                ),
            ),
          ),
        ),
      );

    for (const row of rows) {
      candidates.push({
        ...row,
        branchId: branch.branchId,
        branchName: branch.branchName,
        attendanceDate: branch.attendanceDate,
      });
    }
  }

  return candidates;
}

function loadAbsentTiers(ctx: Context) {
  return ctx.db
    .select()
    .from(notificationTiers)
    .where(eq(notificationTiers.condition, CONDITION))
    .orderBy(asc(notificationTiers.threshold));
}

type AbsentTier = Awaited<ReturnType<typeof loadAbsentTiers>>[number];

async function countWeeklyAbsenceOccurrences(
  ctx: Context,
  candidate: AbsenceCandidate,
  workingDays: WorkingDayFlag[],
): Promise<number> {
  const weekStartWeekday = deriveWeekStartWeekday(workingDays);
  const { start, end } = weekWindowFor(candidate.attendanceDate, weekStartWeekday);

  const [row] = await ctx.db
    .select({ count: sql<number>`count(*)` })
    .from(notificationLog)
    .where(
      and(
        eq(notificationLog.employeeId, candidate.employeeId),
        eq(notificationLog.condition, CONDITION),
        gte(notificationLog.attendanceDate, start),
        lt(notificationLog.attendanceDate, end),
      ),
    );

  return (row?.count ?? 0) + 1;
}

/** Resolves a tier, sends to every recipient, and logs. Returns whether a tier matched. */
async function processCandidate(
  ctx: Context,
  candidate: AbsenceCandidate,
  tiers: AbsentTier[],
  hrEmails: string[],
): Promise<boolean> {
  const workingDays = await ctx.db
    .select({ weekday: branchWorkingDays.weekday, isWorkingDay: branchWorkingDays.isWorkingDay })
    .from(branchWorkingDays)
    .where(eq(branchWorkingDays.branchId, candidate.branchId));

  const occurrenceCount = await countWeeklyAbsenceOccurrences(ctx, candidate, workingDays);
  const tier = resolveNotificationTier(tiers, occurrenceCount);

  if (!tier) {
    return false;
  }

  const employeeName = [candidate.firstName, candidate.middleName, candidate.lastName]
    .filter((part): part is string => Boolean(part))
    .join(" ");

  const values: TemplateValues = {
    employeeName,
    occurrenceCount,
    date: candidate.attendanceDate,
    branchName: candidate.branchName,
  };
  const subject = renderTemplate(tier.subjectTemplate, values);
  const body = renderTemplate(tier.bodyTemplate, values);

  const recipients = resolveNotificationRecipients(hrEmails, candidate.email);

  for (const to of recipients) {
    try {
      await ctx.mailer.send({ to, subject, body });
    } catch (error) {
      console.error(
        `[absence-scan] failed to email ${to} for employee ${candidate.employeeId}:`,
        error,
      );
    }
  }

  await ctx.db.insert(notificationLog).values({
    employeeId: candidate.employeeId,
    attendanceDate: candidate.attendanceDate,
    condition: CONDITION,
    occurrenceCount,
    tierId: tier.id,
  });

  return true;
}
