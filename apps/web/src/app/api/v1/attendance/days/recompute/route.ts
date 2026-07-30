import { recomputeDay } from "@UnifiedAttendance/api";
import { recomputeDayInput } from "@UnifiedAttendance/api/validations/attendance";
import { route } from "@/lib/route";

/** Re-derives one employee-day from its raw events. A command, so POST. */
export const POST = route({
  input: recomputeDayInput,
  handler: ({ ctx, input }) => recomputeDay(ctx, input),
});
