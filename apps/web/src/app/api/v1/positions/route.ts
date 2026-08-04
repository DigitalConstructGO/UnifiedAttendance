import { createPosition, listPositions } from "@UnifiedAttendance/api";
import { createPositionInput } from "@UnifiedAttendance/api/validations/workforce";
import { route } from "@/lib/route";

export const GET = route({ handler: ({ ctx }) => listPositions(ctx) });

export const POST = route({
  input: createPositionInput,
  status: 201,
  handler: ({ ctx, input }) => createPosition(ctx, input),
});
