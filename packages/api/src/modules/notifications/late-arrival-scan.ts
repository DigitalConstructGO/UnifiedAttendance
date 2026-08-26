import { and, asc, eq, exists, gt, gte, inArray, isNull, lt, not, sql } from "drizzle-orm";

import {
  attendanceDays,
  branches,
  branchWorkingDays,
  employees,
  notificationLog,
  notificationTiers,
  people,
  roles,
  user,
  userRoles,
} from "@UnifiedAttendance/db/schema/index";

import { loadBranchesOnHoliday } from "../../attendance/day-context";
import { ROLES } from "../../rbac/permissions";
import { loadBranchToday } from "../reports/expected-days";
import { renderTemplate, type TemplateValues } from "./render-template";
import { resolveNotificationTier } from "./resolve-tier";
import { deriveWeekStartWeekday, weekWindowFor } from "./week-window";

import type { Context } from "../../context";

const CONDITION = "late" as const;

type LateArrivalCandidate = {
  employeeId: string;
  attendanceDate: string;
  lateMinutes: number;
  branchId: string;
  branchName: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  email: string | null;
};

export type LateArrivalScanSummary = {
  candidates: number;
  notified: number;
  skippedNoTier: number;
  failed: number;
};

export async function runLateArrivalScan(ctx: Context): Promise<LateArrivalScanSummary> {
  const branchToday = await loadBranchToday(ctx);
  const [candidates, tiers, hrEmails] = await Promise.all([
    findLateArrivalCandidates(ctx, branchToday),
    loadLateTiers(ctx),
    loadHrEmails(ctx),
  ]);

  const summary: LateArrivalScanSummary = {
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
        `[late-arrival-scan] failed to process employee ${candidate.employeeId} ` +
          `on ${candidate.attendanceDate}:`,
        error,
      );
    }
  }

  return summary;
}

async function findLateArrivalCandidates(
  ctx: Context,
  branchToday: Map<string, string>,
): Promise<LateArrivalCandidate[]> {
  const branchesOnHoliday = await loadBranchesOnHoliday(ctx, branchToday);

  const branchIdsByDate = new Map<string, string[]>();
  for (const [branchId, today] of branchToday) {
    if (branchesOnHoliday.has(branchId)) continue;
    const branchIds = branchIdsByDate.get(today) ?? [];
    branchIds.push(branchId);
    branchIdsByDate.set(today, branchIds);
  }

  const candidates: LateArrivalCandidate[] = [];
  for (const [today, branchIds] of branchIdsByDate) {
    const rows = await ctx.db
      .select({
        employeeId: attendanceDays.employeeId,
        attendanceDate: attendanceDays.attendanceDate,
        lateMinutes: attendanceDays.lateMinutes,
        branchId: employees.branchId,
        branchName: branches.name,
        firstName: people.firstName,
        middleName: people.middleName,
        lastName: people.lastName,
        email: people.email,
      })
      .from(attendanceDays)
      .innerJoin(employees, eq(employees.id, attendanceDays.employeeId))
      .innerJoin(branches, eq(branches.id, employees.branchId))
      .innerJoin(people, eq(people.id, employees.personId))
      .where(
        and(
          eq(attendanceDays.attendanceDate, today),
          inArray(employees.branchId, branchIds),
          gt(attendanceDays.lateMinutes, 0),
          isNull(employees.archivedAt),
          not(
            exists(
              ctx.db
                .select({ one: sql`1` })
                .from(notificationLog)
                .where(
                  and(
                    eq(notificationLog.employeeId, attendanceDays.employeeId),
                    eq(notificationLog.attendanceDate, attendanceDays.attendanceDate),
                    eq(notificationLog.condition, CONDITION),
                  ),
                ),
            ),
          ),
        ),
      );

    for (const row of rows) candidates.push({ ...row, lateMinutes: row.lateMinutes ?? 0 });
  }
  return candidates;
}

function loadLateTiers(ctx: Context) {
  return ctx.db
    .select()
    .from(notificationTiers)
    .where(eq(notificationTiers.condition, CONDITION))
    .orderBy(asc(notificationTiers.threshold));
}

type LateTier = Awaited<ReturnType<typeof loadLateTiers>>[number];

async function loadHrEmails(ctx: Context): Promise<string[]> {
  const rows = await ctx.db
    .select({ email: user.email })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(user, eq(user.id, userRoles.userId))
    .where(eq(roles.name, ROLES.hr));
  return rows.map((row) => row.email).filter((email): email is string => Boolean(email));
}

async function countWeeklyLateOccurrences(
  ctx: Context,
  candidate: LateArrivalCandidate,
): Promise<number> {
  const workingDays = await ctx.db
    .select({ weekday: branchWorkingDays.weekday, isWorkingDay: branchWorkingDays.isWorkingDay })
    .from(branchWorkingDays)
    .where(eq(branchWorkingDays.branchId, candidate.branchId));

  const weekStartWeekday = deriveWeekStartWeekday(workingDays);
  const { start, end } = weekWindowFor(candidate.attendanceDate, weekStartWeekday);

  const [row] = await ctx.db
    .select({ count: sql<number>`count(*)` })
    .from(attendanceDays)
    .where(
      and(
        eq(attendanceDays.employeeId, candidate.employeeId),
        gt(attendanceDays.lateMinutes, 0),
        gte(attendanceDays.attendanceDate, start),
        lt(attendanceDays.attendanceDate, end),
      ),
    );

  return row?.count ?? 0;
}

async function processCandidate(
  ctx: Context,
  candidate: LateArrivalCandidate,
  tiers: LateTier[],
  hrEmails: string[],
): Promise<boolean> {
  const occurrenceCount = await countWeeklyLateOccurrences(ctx, candidate);
  const tier = resolveNotificationTier(tiers, occurrenceCount);

  if (!tier) {
    return false;
  }

  const employeeName = [candidate.firstName, candidate.middleName, candidate.lastName]
    .filter((part): part is string => Boolean(part))
    .join(" ");
  const values: TemplateValues = {
    employeeName,
    lateMinutes: candidate.lateMinutes,
    occurrenceCount,
    date: candidate.attendanceDate,
    branchName: candidate.branchName,
  };
  const subject = renderTemplate(tier.subjectTemplate, values);
  const body = renderTemplate(tier.bodyTemplate, values);

  const recipients = new Set(hrEmails);
  if (candidate.email) recipients.add(candidate.email);

  for (const to of recipients) {
    try {
      await ctx.mailer.send({ to, subject, body });
    } catch (error) {
      console.error(
        `[late-arrival-scan] failed to email ${to} for employee ${candidate.employeeId}:`,
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
