import { syncHolidays } from "@UnifiedAttendance/api";
import { syncHolidaysInput } from "@UnifiedAttendance/api/validations/organization";
import { route } from "@/lib/route";

export const POST = route({
  input: syncHolidaysInput,
  handler: ({ ctx }) => syncHolidays(ctx),
});
