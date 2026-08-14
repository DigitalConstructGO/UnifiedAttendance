import { restoreBranch } from "@UnifiedAttendance/api";
import { branchIdInput } from "@UnifiedAttendance/api/validations/organization";
import { route } from "@/lib/route";

export const POST = route({
  input: branchIdInput,
  handler: ({ ctx, input }) => restoreBranch(ctx, input),
});
