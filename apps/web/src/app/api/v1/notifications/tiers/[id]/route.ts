import { deleteNotificationTier, updateNotificationTier } from "@UnifiedAttendance/api";
import {
  notificationTierIdInput,
  updateNotificationTierInput,
} from "@UnifiedAttendance/api/validations/notifications";
import { route } from "@/lib/route";

export const PATCH = route({
  input: updateNotificationTierInput,
  handler: ({ ctx, input }) => updateNotificationTier(ctx, input),
});

export const DELETE = route({
  input: notificationTierIdInput,
  handler: ({ ctx, input }) => deleteNotificationTier(ctx, input),
});
