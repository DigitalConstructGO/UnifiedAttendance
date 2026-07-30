import { getEmployee, updateEmployee } from "@UnifiedAttendance/api";
import { resourceIdInput, updateEmployeeInput } from "@UnifiedAttendance/api/validations/workforce";
import { route } from "@/lib/route";

export const GET = route({
  input: resourceIdInput,
  handler: ({ ctx, input }) => getEmployee(ctx, input),
});

export const PATCH = route({
  input: updateEmployeeInput,
  handler: ({ ctx, input }) => updateEmployee(ctx, input),
});
