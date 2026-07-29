import { deletePosition, updatePosition } from "@UnifiedAttendance/api";
import { resourceIdInput, updatePositionInput } from "@UnifiedAttendance/api/validations/workforce";
import { route } from "@/lib/route";

export const PATCH = route({
  input: updatePositionInput,
  handler: ({ ctx, input }) => updatePosition(ctx, input),
});

export const DELETE = route({
  input: resourceIdInput,
  handler: ({ ctx, input }) => deletePosition(ctx, input),
});
