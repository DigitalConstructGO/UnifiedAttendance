import { deleteDepartment, updateDepartment } from "@UnifiedAttendance/api";
import { resourceIdInput, updateDepartmentInput } from "@UnifiedAttendance/api/validations/workforce";
import { route } from "@/lib/route";

export const PATCH = route({
  input: updateDepartmentInput,
  handler: ({ ctx, input }) => updateDepartment(ctx, input),
});

export const DELETE = route({
  input: resourceIdInput,
  handler: ({ ctx, input }) => deleteDepartment(ctx, input),
});
