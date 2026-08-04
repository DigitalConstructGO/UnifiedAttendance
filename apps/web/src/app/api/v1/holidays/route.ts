import { createHoliday, listHolidays } from "@UnifiedAttendance/api";
import {
  createHolidayInput,
  listHolidaysInput,
} from "@UnifiedAttendance/api/validations/organization";
import { route } from "@/lib/route";

export const GET = route({
  input: listHolidaysInput,
  handler: ({ ctx, input }) => listHolidays(ctx, input),
});

export const POST = route({
  input: createHolidayInput,
  status: 201,
  handler: ({ ctx, input }) => createHoliday(ctx, input),
});
