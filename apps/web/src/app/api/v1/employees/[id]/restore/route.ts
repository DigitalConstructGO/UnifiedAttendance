import { restoreEmployee } from "@UnifiedAttendance/api";
import { resourceIdInput } from "@UnifiedAttendance/api/validations/workforce";
import { route } from "@/lib/route";

export const POST = route({
  input: resourceIdInput,
  handler: ({ ctx, input }) => restoreEmployee(ctx, input),
});
