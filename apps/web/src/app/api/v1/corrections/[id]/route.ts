import { deleteCorrection, updateCorrection } from "@UnifiedAttendance/api";
import {
  deleteCorrectionInput,
  updateCorrectionInput,
} from "@UnifiedAttendance/api/validations/corrections";
import { route } from "@/lib/route";

export const PATCH = route({
  input: updateCorrectionInput,
  handler: ({ ctx, input }) => updateCorrection(ctx, input),
});

export const DELETE = route({
  input: deleteCorrectionInput,
  handler: ({ ctx, input }) => deleteCorrection(ctx, input),
});
