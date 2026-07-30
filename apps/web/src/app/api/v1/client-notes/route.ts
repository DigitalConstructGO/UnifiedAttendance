import { createClientNote, listClientNotes } from "@UnifiedAttendance/api";
import {
  createClientNoteInput,
  listClientNotesInput,
} from "@UnifiedAttendance/api/validations/clients";

import { route } from "@/lib/route";

export const GET = route({
  input: listClientNotesInput,
  handler: ({ ctx, input }) => listClientNotes(ctx, input),
});

export const POST = route({
  input: createClientNoteInput,
  status: 201,
  handler: ({ ctx, input }) => createClientNote(ctx, input),
});
