import { updateCrmActivity } from "@UnifiedAttendance/api";
import { updateCrmActivityInput } from "@UnifiedAttendance/api/validations/clients";

import { route } from "@/lib/route";

export const PATCH = route({
  input: updateCrmActivityInput,
  handler: ({ ctx, input }) => updateCrmActivity(ctx, input),
});
