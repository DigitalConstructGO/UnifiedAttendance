import { deleteEmploymentContract, updateEmploymentContract } from "@UnifiedAttendance/api";
import {
  resourceIdInput,
  updateEmploymentContractInput,
} from "@UnifiedAttendance/api/validations/workforce";

import { route } from "@/lib/route";

export const PATCH = route({
  input: updateEmploymentContractInput,
  handler: ({ ctx, input }) => updateEmploymentContract(ctx, input),
});

export const DELETE = route({
  input: resourceIdInput,
  handler: ({ ctx, input }) => deleteEmploymentContract(ctx, input),
});
