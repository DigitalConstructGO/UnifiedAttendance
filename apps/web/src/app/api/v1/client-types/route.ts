import { createClientType, listClientTypes } from "@UnifiedAttendance/api";
import { createClientTypeInput } from "@UnifiedAttendance/api/validations/clients";
import { route } from "@/lib/route";

export const GET = route({ handler: ({ ctx }) => listClientTypes(ctx) });

export const POST = route({
  input: createClientTypeInput,
  status: 201,
  handler: ({ ctx, input }) => createClientType(ctx, input),
});
