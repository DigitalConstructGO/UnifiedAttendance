import { convertOpportunity } from "@UnifiedAttendance/api";
import { convertOpportunityInput } from "@UnifiedAttendance/api/validations/clients";
import { route } from "@/lib/route";

export const POST = route({
  input: convertOpportunityInput,
  handler: ({ ctx, input }) => convertOpportunity(ctx, input),
});
