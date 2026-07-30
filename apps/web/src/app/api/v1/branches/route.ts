import { createBranch, listBranches } from "@UnifiedAttendance/api";
import { createBranchInput } from "@UnifiedAttendance/api/validations/organization";
import { route } from "@/lib/route";

export const GET = route({ handler: ({ ctx }) => listBranches(ctx) });

export const POST = route({
  input: createBranchInput,
  status: 201,
  handler: ({ ctx, input }) => createBranch(ctx, input),
});
