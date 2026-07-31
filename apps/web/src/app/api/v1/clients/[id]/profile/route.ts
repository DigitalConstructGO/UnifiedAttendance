import { getClientProfile } from "@UnifiedAttendance/api";
import { clientProjectionInput } from "@UnifiedAttendance/api/validations/clients";

import { route } from "@/lib/route";

export const GET = route({
  input: clientProjectionInput,
  handler: ({ ctx, input }) => getClientProfile(ctx, input),
});
