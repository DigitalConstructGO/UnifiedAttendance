import { createBranch, listBranches } from "@UnifiedAttendance/api";
import {
  createBranchInput,
  listBranchesInput,
} from "@UnifiedAttendance/api/validations/organization";
import { route } from "@/lib/route";

export const GET = route({
  input: listBranchesInput,
  handler: ({ ctx, input }) => listBranches(ctx, input),
});

export const POST = route({
  input: createBranchInput,
  status: 201,
  handler: ({ ctx, input }) => createBranch(ctx, input),
});
