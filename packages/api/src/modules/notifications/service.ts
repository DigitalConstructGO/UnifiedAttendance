import { and, asc, eq, ne } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import { notificationTiers } from "@UnifiedAttendance/db/schema/index";
import type { NOTIFICATION_CONDITIONS } from "@UnifiedAttendance/db/schema/index";

import { conflict, notFound } from "../../errors";
import { requirePermission } from "../shared/guards";

import type {
  CreateNotificationTierInput,
  ListNotificationTiersInput,
  NotificationTierIdInput,
  UpdateNotificationTierInput,
} from "../../validations/notifications";
import type { Context } from "../../context";

type NotificationCondition = (typeof NOTIFICATION_CONDITIONS)[number];

async function assertNoThresholdConflict(
  ctx: Context,
  condition: NotificationCondition,
  threshold: number,
  excludeId?: string,
) {
  const [existing] = await ctx.db
    .select({ id: notificationTiers.id })
    .from(notificationTiers)
    .where(
      and(
        eq(notificationTiers.condition, condition),
        eq(notificationTiers.threshold, threshold),
        excludeId ? ne(notificationTiers.id, excludeId) : undefined,
      ),
    )
    .limit(1);
  if (existing) {
    conflict(`A "${condition}" tier already exists at threshold ${threshold}`);
  }
}

export async function listNotificationTiers(ctx: Context, input: ListNotificationTiersInput = {}) {
  await requirePermission(ctx, "notifications.manage");
  return ctx.db
    .select()
    .from(notificationTiers)
    .where(input.condition ? eq(notificationTiers.condition, input.condition) : undefined)
    .orderBy(asc(notificationTiers.threshold));
}

export async function createNotificationTier(ctx: Context, input: CreateNotificationTierInput) {
  await requirePermission(ctx, "notifications.manage");
  await assertNoThresholdConflict(ctx, input.condition, input.threshold);
  const [tier] = await ctx.db.insert(notificationTiers).values(input).returning();
  return tier;
}

export async function updateNotificationTier(ctx: Context, input: UpdateNotificationTierInput) {
  await requirePermission(ctx, "notifications.manage");
  const [existing] = await ctx.db
    .select()
    .from(notificationTiers)
    .where(eq(notificationTiers.id, input.id))
    .limit(1);
  if (!existing) notFound("Notification tier");

  const { id: tierId, ...values } = input;
  if (values.condition !== undefined || values.threshold !== undefined) {
    await assertNoThresholdConflict(
      ctx,
      values.condition ?? existing.condition,
      values.threshold ?? existing.threshold,
      tierId,
    );
  }

  const [tier] = await ctx.db
    .update(notificationTiers)
    .set(values)
    .where(eq(notificationTiers.id, tierId))
    .returning();
  return tier;
}

export async function deleteNotificationTier(ctx: Context, input: NotificationTierIdInput) {
  await requirePermission(ctx, "notifications.manage");
  const [existing] = await ctx.db
    .select({ id: notificationTiers.id })
    .from(notificationTiers)
    .where(eq(notificationTiers.id, input.id))
    .limit(1);
  if (!existing) notFound("Notification tier");

  const [tier] = await ctx.db
    .delete(notificationTiers)
    .where(eq(notificationTiers.id, input.id))
    .returning();
  return tier;
}

const DEFAULT_TIERS = [
  {
    condition: "late" as const,
    threshold: 1,
    subjectTemplate: "Attendance Notice",
    bodyTemplate: "Hi {{employeeName}}, you were marked late on {{date}}.",
  },
  {
    condition: "absent" as const,
    threshold: 1,
    subjectTemplate: "Attendance Notice",
    bodyTemplate: "Hi {{employeeName}}, you were marked absent on {{date}}.",
  },
];

export async function seedDefaultNotificationTiers(ctx: Pick<Context, "db"> = { db }) {
  await ctx.db.insert(notificationTiers).values(DEFAULT_TIERS).onConflictDoNothing();
}
