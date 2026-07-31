import { createCrmActivity, listCrmActivities } from "@UnifiedAttendance/api";
import {
  createCrmActivityInput,
  listCrmActivitiesInput,
} from "@UnifiedAttendance/api/validations/clients";

import { route } from "@/lib/route";

export const GET = route({
  input: listCrmActivitiesInput,
  handler: ({ ctx, input }) => listCrmActivities(ctx, input),
});

export const POST = route({
  input: createCrmActivityInput,
  status: 201,
  handler: ({ ctx, input }) => createCrmActivity(ctx, input),
});
