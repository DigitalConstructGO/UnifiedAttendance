import { createClient, listClients } from "@UnifiedAttendance/api";
import { createClientInput, listClientsInput } from "@UnifiedAttendance/api/validations/clients";
import { route } from "@/lib/route";

export const GET = route({
  input: listClientsInput,
  handler: ({ ctx, input }) => listClients(ctx, input),
});

export const POST = route({
  input: createClientInput,
  status: 201,
  handler: ({ ctx, input }) => createClient(ctx, input),
});
