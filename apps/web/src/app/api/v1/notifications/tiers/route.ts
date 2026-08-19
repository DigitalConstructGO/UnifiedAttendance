import { createNotificationTier, listNotificationTiers } from "@UnifiedAttendance/api";
import {
  createNotificationTierInput,
  listNotificationTiersInput,
} from "@UnifiedAttendance/api/validations/notifications";
import { route } from "@/lib/route";

export const GET = route({
  input: listNotificationTiersInput,
  handler: ({ ctx, input }) => listNotificationTiers(ctx, input),
});

export const POST = route({
  input: createNotificationTierInput,
  status: 201,
  handler: ({ ctx, input }) => createNotificationTier(ctx, input),
});
