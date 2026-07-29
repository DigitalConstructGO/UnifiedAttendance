import { listWorkingDays, replaceWorkingDays } from "@UnifiedAttendance/api";
import { replaceWorkingDaysInput, workingDaysInput } from "@UnifiedAttendance/api/validations/organization";
import { route } from "@/lib/route";

export const GET = route({
  input: workingDaysInput,
  handler: ({ ctx, input }) => listWorkingDays(ctx, input),
});

/** PUT, not PATCH: the seven days are replaced wholesale. */
export const PUT = route({
  input: replaceWorkingDaysInput,
  handler: ({ ctx, input }) => replaceWorkingDays(ctx, input),
});
