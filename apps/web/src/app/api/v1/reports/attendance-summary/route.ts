import { getAttendanceSummary } from "@UnifiedAttendance/api";
import { attendanceSummaryInput } from "@UnifiedAttendance/api/validations/reports";

import { route } from "@/lib/route";

export const GET = route({
  input: attendanceSummaryInput,
  handler: ({ ctx, input }) => getAttendanceSummary(ctx, input),
});
