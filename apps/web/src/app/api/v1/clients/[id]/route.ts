import { archiveClient, getClient, updateClient } from "@UnifiedAttendance/api";
import {
  clientResourceIdInput,
  updateClientInput,
} from "@UnifiedAttendance/api/validations/clients";
import { route } from "@/lib/route";

export const GET = route({
  input: clientResourceIdInput,
  handler: ({ ctx, input }) => getClient(ctx, input),
});

export const PATCH = route({
  input: updateClientInput,
  handler: ({ ctx, input }) => updateClient(ctx, input),
});

export const DELETE = route({
  input: clientResourceIdInput,
  handler: ({ ctx, input }) => archiveClient(ctx, input),
});
