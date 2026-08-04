import { listPushBatches } from "@UnifiedAttendance/api";
import { listPushBatchesInput } from "@UnifiedAttendance/api/validations/attendance";
import { route } from "@/lib/route";

export const GET = route({
  input: listPushBatchesInput,
  handler: ({ ctx, input }) => listPushBatches(ctx, input),
});
