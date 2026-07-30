import { createPipelineStage, listPipelineStages } from "@UnifiedAttendance/api";
import { createPipelineStageInput } from "@UnifiedAttendance/api/validations/clients";
import { route } from "@/lib/route";

export const GET = route({ handler: ({ ctx }) => listPipelineStages(ctx) });

export const POST = route({
  input: createPipelineStageInput,
  status: 201,
  handler: ({ ctx, input }) => createPipelineStage(ctx, input),
});
