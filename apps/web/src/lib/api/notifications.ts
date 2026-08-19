import type { z } from "zod";
import type * as service from "@UnifiedAttendance/api/modules/notifications/service";
import type * as validations from "@UnifiedAttendance/api/validations/notifications";

import { apiFetch, type JsonOf } from "./client";

type Returned<T extends (...args: never[]) => unknown> = JsonOf<Awaited<ReturnType<T>>>;

export type NotificationTier = Returned<typeof service.listNotificationTiers>[number];
export type NotificationCondition = NotificationTier["condition"];

export const notificationKeys = {
  tiersAll: ["notification-tiers"] as const,
  tiers: (condition?: NotificationCondition) =>
    ["notification-tiers", { condition: condition ?? "all" }] as const,
};

export const notificationsApi = {
  tiers: (condition?: NotificationCondition, signal?: AbortSignal) =>
    apiFetch<NotificationTier[]>("/notifications/tiers", { query: { condition }, signal }),
  createTier: (input: z.input<typeof validations.createNotificationTierInput>) =>
    apiFetch<NotificationTier>("/notifications/tiers", { method: "POST", body: input }),
  updateTier: ({ id, ...values }: z.input<typeof validations.updateNotificationTierInput>) =>
    apiFetch<NotificationTier>(`/notifications/tiers/${id}`, { method: "PATCH", body: values }),
  deleteTier: (id: string) =>
    apiFetch<NotificationTier>(`/notifications/tiers/${id}`, { method: "DELETE" }),
};
