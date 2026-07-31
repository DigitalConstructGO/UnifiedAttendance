import { updatePipelineStage } from "@UnifiedAttendance/api";
import { updatePipelineStageInput } from "@UnifiedAttendance/api/validations/clients";
import { route } from "@/lib/route";

export const PATCH = route({
  input: updatePipelineStageInput,
  handler: ({ ctx, input }) => updatePipelineStage(ctx, input),
});
