import { updateOrganization } from "@UnifiedAttendance/api";
import { updateOrganizationInput } from "@UnifiedAttendance/api/validations/organization";
import { route } from "@/lib/route";

export const PATCH = route({
  input: updateOrganizationInput,
  handler: ({ ctx, input }) => updateOrganization(ctx, input),
});
