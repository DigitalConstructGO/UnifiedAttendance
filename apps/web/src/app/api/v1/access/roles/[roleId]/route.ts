import { archiveRole, updateRole } from "@UnifiedAttendance/api";
import { roleIdInput, updateRoleInput } from "@UnifiedAttendance/api/validations/access";
import { route } from "@/lib/route";

export const PATCH = route({
  input: updateRoleInput,
  handler: ({ ctx, input }) => updateRole(ctx, input),
});

export const DELETE = route({
  input: roleIdInput,
  handler: ({ ctx, input }) => archiveRole(ctx, input),
});
