import { createEmployee, listEmployees } from "@UnifiedAttendance/api";
import { createEmployeeInput, listEmployeesInput } from "@UnifiedAttendance/api/validations/workforce";
import { route } from "@/lib/route";

export const GET = route({
  input: listEmployeesInput,
  handler: ({ ctx, input }) => listEmployees(ctx, input),
});

export const POST = route({
  input: createEmployeeInput,
  status: 201,
  handler: ({ ctx, input }) => createEmployee(ctx, input),
});
