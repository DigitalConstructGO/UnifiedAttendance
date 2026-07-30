import { listOpportunityStageTransitions } from "@UnifiedAttendance/api";
import { listOpportunityStageTransitionsInput } from "@UnifiedAttendance/api/validations/clients";
import { route } from "@/lib/route";

export const GET = route({
  input: listOpportunityStageTransitionsInput,
  handler: ({ ctx, input }) => listOpportunityStageTransitions(ctx, input),
});
