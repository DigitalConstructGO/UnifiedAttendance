import { createEmploymentContract, listEmploymentContracts } from "@UnifiedAttendance/api";
import {
  createEmploymentContractInput,
  listEmploymentContractsInput,
} from "@UnifiedAttendance/api/validations/workforce";

import { route } from "@/lib/route";

export const GET = route({
  input: listEmploymentContractsInput,
  handler: ({ ctx, input }) => listEmploymentContracts(ctx, input),
});

export const POST = route({
  input: createEmploymentContractInput,
  status: 201,
  handler: ({ ctx, input }) => createEmploymentContract(ctx, input),
});
