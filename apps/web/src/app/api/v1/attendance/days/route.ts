import { listDays } from "@UnifiedAttendance/api";
import { listDaysInput } from "@UnifiedAttendance/api/validations/attendance";
import { route } from "@/lib/route";

export const GET = route({
  input: listDaysInput,
  handler: ({ ctx, input }) => listDays(ctx, input),
});
