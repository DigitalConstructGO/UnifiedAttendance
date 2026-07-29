import { createDepartment, listDepartments } from "@UnifiedAttendance/api";
import { createDepartmentInput } from "@UnifiedAttendance/api/validations/workforce";
import { route } from "@/lib/route";

export const GET = route({ handler: ({ ctx }) => listDepartments(ctx) });

export const POST = route({
  input: createDepartmentInput,
  status: 201,
  handler: ({ ctx, input }) => createDepartment(ctx, input),
});
