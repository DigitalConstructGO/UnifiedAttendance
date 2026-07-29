import { deleteCosigner, updateCosigner } from "@UnifiedAttendance/api";
import { resourceIdInput, updateCosignerInput } from "@UnifiedAttendance/api/validations/workforce";
import { route } from "@/lib/route";

export const PATCH = route({
  input: updateCosignerInput,
  handler: ({ ctx, input }) => updateCosigner(ctx, input),
});

export const DELETE = route({
  input: resourceIdInput,
  handler: ({ ctx, input }) => deleteCosigner(ctx, input),
});
