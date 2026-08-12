import { deleteCrmActivity, updateCrmActivity } from "@UnifiedAttendance/api";
import {
  clientResourceIdInput,
  updateCrmActivityInput,
} from "@UnifiedAttendance/api/validations/clients";

import { route } from "@/lib/route";

export const PATCH = route({
  input: updateCrmActivityInput,
  handler: ({ ctx, input }) => updateCrmActivity(ctx, input),
});

export const DELETE = route({
  input: clientResourceIdInput,
  handler: ({ ctx, input }) => deleteCrmActivity(ctx, input),
});
