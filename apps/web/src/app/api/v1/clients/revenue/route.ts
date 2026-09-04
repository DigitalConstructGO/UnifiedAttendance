import { getRevenueReport } from "@UnifiedAttendance/api";
import { revenueReportInput } from "@UnifiedAttendance/api/validations/clients";

import { route } from "@/lib/route";

export const GET = route({
  input: revenueReportInput,
  handler: ({ ctx, input }) => getRevenueReport(ctx, input),
});
