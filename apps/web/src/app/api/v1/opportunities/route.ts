import { createOpportunity, listOpportunities } from "@UnifiedAttendance/api";
import {
  createOpportunityInput,
  listOpportunitiesInput,
} from "@UnifiedAttendance/api/validations/clients";
import { route } from "@/lib/route";

export const GET = route({
  input: listOpportunitiesInput,
  handler: ({ ctx, input }) => listOpportunities(ctx, input),
});

export const POST = route({
  input: createOpportunityInput,
  status: 201,
  handler: ({ ctx, input }) => createOpportunity(ctx, input),
});
