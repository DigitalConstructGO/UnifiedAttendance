import { deleteOpportunity, getOpportunity, updateOpportunity } from "@UnifiedAttendance/api";
import {
  clientResourceIdInput,
  updateOpportunityInput,
} from "@UnifiedAttendance/api/validations/clients";
import { route } from "@/lib/route";

export const GET = route({
  input: clientResourceIdInput,
  handler: ({ ctx, input }) => getOpportunity(ctx, input),
});

export const PATCH = route({
  input: updateOpportunityInput,
  handler: ({ ctx, input }) => updateOpportunity(ctx, input),
});

export const DELETE = route({
  input: clientResourceIdInput,
  handler: ({ ctx, input }) => deleteOpportunity(ctx, input),
});
