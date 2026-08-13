import { deleteEmployee, getEmployee, updateEmployee } from "@UnifiedAttendance/api";
import { resourceIdInput, updateEmployeeInput } from "@UnifiedAttendance/api/validations/workforce";
import { personAssetUrls } from "@/lib/person-assets";
import { route } from "@/lib/route";

export const GET = route({
  input: resourceIdInput,
  handler: async ({ ctx, input }) => {
    const row = await getEmployee(ctx, input);
    return { ...row, personAssets: personAssetUrls(row.person) };
  },
});

export const PATCH = route({
  input: updateEmployeeInput,
  handler: ({ ctx, input }) => updateEmployee(ctx, input),
});

export const DELETE = route({
  input: resourceIdInput,
  handler: ({ ctx, input }) => deleteEmployee(ctx, input),
});
