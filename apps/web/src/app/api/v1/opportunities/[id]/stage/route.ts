import { transitionOpportunityStage } from "@UnifiedAttendance/api";
import { transitionOpportunityStageInput } from "@UnifiedAttendance/api/validations/clients";
import { route } from "@/lib/route";

export const POST = route({
  input: transitionOpportunityStageInput,
  handler: ({ ctx, input }) => transitionOpportunityStage(ctx, input),
});
