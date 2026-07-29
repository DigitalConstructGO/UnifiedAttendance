import { updateCorrection } from "@UnifiedAttendance/api";
import { updateCorrectionInput } from "@UnifiedAttendance/api/validations/corrections";
import { route } from "@/lib/route";

export const PATCH = route({
  input: updateCorrectionInput,
  handler: ({ ctx, input }) => updateCorrection(ctx, input),
});
