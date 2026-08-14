import { branchIdInput, updateBranchInput } from "@UnifiedAttendance/api/validations/organization";
import { deleteBranch, getBranch, updateBranch } from "@UnifiedAttendance/api";
import { route } from "@/lib/route";

export const GET = route({
  input: branchIdInput,
  handler: ({ ctx, input }) => getBranch(ctx, input),
});

export const PATCH = route({
  input: updateBranchInput,
  handler: ({ ctx, input }) => updateBranch(ctx, input),
});

export const DELETE = route({
  input: branchIdInput,
  handler: ({ ctx, input }) => deleteBranch(ctx, input),
});
