import {
  deleteCommercialContract,
  getCommercialContract,
  updateCommercialContract,
} from "@UnifiedAttendance/api";
import {
  clientResourceIdInput,
  updateCommercialContractInput,
} from "@UnifiedAttendance/api/validations/clients";
import { route } from "@/lib/route";

export const GET = route({
  input: clientResourceIdInput,
  handler: ({ ctx, input }) => getCommercialContract(ctx, input),
});

export const PATCH = route({
  input: updateCommercialContractInput,
  handler: ({ ctx, input }) => updateCommercialContract(ctx, input),
});

export const DELETE = route({
  input: clientResourceIdInput,
  handler: ({ ctx, input }) => deleteCommercialContract(ctx, input),
});
