import { archiveClientNote, updateClientNote } from "@UnifiedAttendance/api";
import {
  clientResourceIdInput,
  updateClientNoteInput,
} from "@UnifiedAttendance/api/validations/clients";

import { route } from "@/lib/route";

export const PATCH = route({
  input: updateClientNoteInput,
  handler: ({ ctx, input }) => updateClientNote(ctx, input),
});

export const DELETE = route({
  input: clientResourceIdInput,
  handler: ({ ctx, input }) => archiveClientNote(ctx, input),
});
