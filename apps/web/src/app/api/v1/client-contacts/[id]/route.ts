import { archiveClientContact, updateClientContact } from "@UnifiedAttendance/api";
import {
  clientResourceIdInput,
  updateClientContactInput,
} from "@UnifiedAttendance/api/validations/clients";
import { route } from "@/lib/route";

export const PATCH = route({
  input: updateClientContactInput,
  handler: ({ ctx, input }) => updateClientContact(ctx, input),
});

export const DELETE = route({
  input: clientResourceIdInput,
  handler: ({ ctx, input }) => archiveClientContact(ctx, input),
});
