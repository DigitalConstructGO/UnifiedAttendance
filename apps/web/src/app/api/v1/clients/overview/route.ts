import { getClientOverview } from "@UnifiedAttendance/api";
import { clientOverviewInput } from "@UnifiedAttendance/api/validations/clients";

import { route } from "@/lib/route";

export const GET = route({
  input: clientOverviewInput,
  handler: ({ ctx, input }) => getClientOverview(ctx, input),
});
