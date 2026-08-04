import { getOperationsOverview } from "@UnifiedAttendance/api";
import { operationsOverviewInput } from "@UnifiedAttendance/api/validations/overview";
import { route } from "@/lib/route";

export const GET = route({
  input: operationsOverviewInput,
  handler: ({ ctx, input }) => getOperationsOverview(ctx, input),
});
