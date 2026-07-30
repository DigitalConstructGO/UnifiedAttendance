import { createCommercialContract, listCommercialContracts } from "@UnifiedAttendance/api";
import {
  createCommercialContractInput,
  listCommercialContractsInput,
} from "@UnifiedAttendance/api/validations/clients";
import { route } from "@/lib/route";

export const GET = route({
  input: listCommercialContractsInput,
  handler: ({ ctx, input }) => listCommercialContracts(ctx, input),
});

export const POST = route({
  input: createCommercialContractInput,
  status: 201,
  handler: ({ ctx, input }) => createCommercialContract(ctx, input),
});
