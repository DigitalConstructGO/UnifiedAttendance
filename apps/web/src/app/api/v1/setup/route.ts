import { bootstrapOrganization } from "@UnifiedAttendance/api";
import { bootstrapOrganizationInput } from "@UnifiedAttendance/api/validations/organization";

import { route } from "@/lib/route";

export const POST = route({
  input: bootstrapOrganizationInput,
  status: 201,
  handler: ({ ctx, input }) => bootstrapOrganization(ctx, input),
});
