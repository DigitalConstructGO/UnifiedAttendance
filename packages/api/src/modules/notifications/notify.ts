import { notificationLog } from "@UnifiedAttendance/db/schema/index";

import { resolveNotificationRecipients } from "./recipients";
import { renderTemplate, type TemplateValues } from "./render-template";

import type { Context } from "../../context";
import type { NOTIFICATION_CONDITIONS } from "@UnifiedAttendance/db/schema/index";

type NotificationCondition = (typeof NOTIFICATION_CONDITIONS)[number];

type NotifiableTier = {
  id: string;
  subjectTemplate: string;
  bodyTemplate: string;
};

export type NotifyAndLogInput = {
  condition: NotificationCondition;
  employeeId: string;
  attendanceDate: string;
  tier: NotifiableTier;
  values: TemplateValues;
  hrEmails: readonly string[];
  employeeEmail: string | null;
  occurrenceCount: number;
  /** e.g. `"[late-arrival-scan]"` — prefixed onto any per-recipient failure log. */
  logPrefix: string;
};


export async function notifyAndLog(ctx: Context, input: NotifyAndLogInput): Promise<void> {
  const {
    condition,
    employeeId,
    attendanceDate,
    tier,
    values,
    hrEmails,
    employeeEmail,
    occurrenceCount,
    logPrefix,
  } = input;

  const subject = renderTemplate(tier.subjectTemplate, values);
  const body = renderTemplate(tier.bodyTemplate, values);

  const recipients = resolveNotificationRecipients(hrEmails, employeeEmail);

  for (const to of recipients) {
    try {
      await ctx.mailer.send({ to, subject, body });
    } catch (error) {
      // One broken address must not stop the rest of this employee's
      // recipients, or abort the scan for other employees.
      console.error(`${logPrefix} failed to email ${to} for employee ${employeeId}:`, error);
    }
  }


  await ctx.db.insert(notificationLog).values({
    employeeId,
    attendanceDate,
    condition,
    occurrenceCount,
    tierId: tier.id,
  });
}

export type ScanSummary = {
  candidates: number;
  notified: number;
  skippedNoTier: number;
  failed: number;
};


export async function runScan<C>(
  candidates: C[],
  processOne: (candidate: C) => Promise<boolean>,
  logPrefix: string,
  describeCandidate: (candidate: C) => string,
): Promise<ScanSummary> {
  const summary: ScanSummary = {
    candidates: candidates.length,
    notified: 0,
    skippedNoTier: 0,
    failed: 0,
  };

  for (const candidate of candidates) {
    try {
      const notified = await processOne(candidate);
      if (notified) summary.notified += 1;
      else summary.skippedNoTier += 1;
    } catch (error) {
      summary.failed += 1;
      console.error(`${logPrefix} failed to process ${describeCandidate(candidate)}:`, error);
    }
  }

  return summary;
}
