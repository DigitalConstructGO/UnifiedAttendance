import { createRole, listRoles } from "@UnifiedAttendance/api";
import { createRoleInput } from "@UnifiedAttendance/api/validations/access";
import { route } from "@/lib/route";

export const GET = route({ handler: ({ ctx }) => listRoles(ctx) });

export const POST = route({
  input: createRoleInput,
  status: 201,
  handler: ({ ctx, input }) => createRole(ctx, input),
});
