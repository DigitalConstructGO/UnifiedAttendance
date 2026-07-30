import { updateRolePermissions } from "@UnifiedAttendance/api";
import { updateRolePermissionsInput } from "@UnifiedAttendance/api/validations/access";
import { route } from "@/lib/route";

export const PUT = route({
  input: updateRolePermissionsInput,
  handler: ({ ctx, input }) => updateRolePermissions(ctx, input),
});
