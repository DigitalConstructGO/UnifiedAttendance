import { listEvents } from "@UnifiedAttendance/api";
import { listEventsInput } from "@UnifiedAttendance/api/validations/attendance";
import { route } from "@/lib/route";

export const GET = route({
  input: listEventsInput,
  handler: ({ ctx, input }) => listEvents(ctx, input),
});
