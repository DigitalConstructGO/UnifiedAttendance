import { z } from "zod";

import { NOTIFICATION_CONDITIONS } from "@UnifiedAttendance/db/schema/notifications";

import { id, text } from "./shared";

export const notificationConditionInput = z.enum(NOTIFICATION_CONDITIONS);

export const listNotificationTiersInput = z.object({
  condition: notificationConditionInput.optional(),
});

export const createNotificationTierInput = z.object({
  condition: notificationConditionInput,
  threshold: z.coerce.number().int().positive(),
  subjectTemplate: text,
  bodyTemplate: text,
});

export const updateNotificationTierInput = z.object({
  id,
  condition: notificationConditionInput.optional(),
  threshold: z.coerce.number().int().positive().optional(),
  subjectTemplate: text.optional(),
  bodyTemplate: text.optional(),
});

export const notificationTierIdInput = z.object({ id });

export type ListNotificationTiersInput = z.output<typeof listNotificationTiersInput>;
export type CreateNotificationTierInput = z.output<typeof createNotificationTierInput>;
export type UpdateNotificationTierInput = z.output<typeof updateNotificationTierInput>;
export type NotificationTierIdInput = z.output<typeof notificationTierIdInput>;
