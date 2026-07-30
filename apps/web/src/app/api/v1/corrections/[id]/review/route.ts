import { reviewCorrection } from "@UnifiedAttendance/api";
import { reviewCorrectionInput } from "@UnifiedAttendance/api/validations/corrections";
import { route } from "@/lib/route";

/** Approving or rejecting is its own sub-resource, kept off the plain PATCH. */
export const POST = route({
  input: reviewCorrectionInput,
  handler: ({ ctx, input }) => reviewCorrection(ctx, input),
});
