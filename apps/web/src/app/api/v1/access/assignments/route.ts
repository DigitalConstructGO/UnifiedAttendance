import { assignRole, listAssignments } from "@UnifiedAttendance/api";
import { assignRoleInput } from "@UnifiedAttendance/api/validations/access";
import { route } from "@/lib/route";

export const GET = route({ handler: ({ ctx }) => listAssignments(ctx) });

export const POST = route({
  input: assignRoleInput,
  status: 201,
  handler: ({ ctx, input }) => assignRole(ctx, input),
});
