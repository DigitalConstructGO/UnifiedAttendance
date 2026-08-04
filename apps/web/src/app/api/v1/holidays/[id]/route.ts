import { deleteHoliday, updateHoliday } from "@UnifiedAttendance/api";
import {
  holidayIdInput,
  updateHolidayInput,
} from "@UnifiedAttendance/api/validations/organization";
import { route } from "@/lib/route";

export const PATCH = route({
  input: updateHolidayInput,
  handler: ({ ctx, input }) => updateHoliday(ctx, input),
});

export const DELETE = route({
  input: holidayIdInput,
  handler: ({ ctx, input }) => deleteHoliday(ctx, input),
});
