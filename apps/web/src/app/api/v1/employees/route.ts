import { createEmployee, listEmployees } from "@UnifiedAttendance/api";
import {
  createEmployeeInput,
  listEmployeesInput,
} from "@UnifiedAttendance/api/validations/workforce";
import { signedPersonAssetUrl } from "@/lib/person-assets";
import { route } from "@/lib/route";

export const GET = route({
  input: listEmployeesInput,
  handler: async ({ ctx, input }) => {
    const rows = await listEmployees(ctx, input);
    return rows.map((row) => ({
      ...row,
      profilePhotoUrl: signedPersonAssetUrl(row.person.profilePhotoUrl),
    }));
  },
});

export const POST = route({
  input: createEmployeeInput,
  status: 201,
  handler: ({ ctx, input }) => createEmployee(ctx, input),
});
