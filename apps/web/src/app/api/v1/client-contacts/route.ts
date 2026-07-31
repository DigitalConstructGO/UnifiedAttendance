import { createClientContact, listClientContacts } from "@UnifiedAttendance/api";
import {
  createClientContactInput,
  listClientContactsInput,
} from "@UnifiedAttendance/api/validations/clients";
import { route } from "@/lib/route";

export const GET = route({
  input: listClientContactsInput,
  handler: ({ ctx, input }) => listClientContacts(ctx, input),
});

export const POST = route({
  input: createClientContactInput,
  status: 201,
  handler: ({ ctx, input }) => createClientContact(ctx, input),
});
