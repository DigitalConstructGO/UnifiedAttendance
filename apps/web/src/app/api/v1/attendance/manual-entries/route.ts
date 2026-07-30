import { createManualAttendanceEntry, listManualAttendanceEntries } from "@UnifiedAttendance/api";
import {
  createManualAttendanceEntryInput,
  listManualAttendanceEntriesInput,
} from "@UnifiedAttendance/api/validations/attendance";

import { route } from "@/lib/route";

export const GET = route({
  input: listManualAttendanceEntriesInput,
  handler: ({ ctx, input }) => listManualAttendanceEntries(ctx, input),
});

export const POST = route({
  input: createManualAttendanceEntryInput,
  status: 201,
  handler: ({ ctx, input }) => createManualAttendanceEntry(ctx, input),
});
