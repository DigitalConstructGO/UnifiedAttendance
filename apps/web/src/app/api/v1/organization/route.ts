import { createOrganization, getOrganization } from "@UnifiedAttendance/api";
import { createOrganizationInput } from "@UnifiedAttendance/api/validations/organization";
import { route } from "@/lib/route";

export const GET = route({ handler: ({ ctx }) => getOrganization(ctx) });

export const POST = route({
  input: createOrganizationInput,
  status: 201,
  handler: ({ ctx, input }) => createOrganization(ctx, input),
});
