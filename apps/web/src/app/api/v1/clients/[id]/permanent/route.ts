import { deleteClient } from "@UnifiedAttendance/api";
import { clientResourceIdInput } from "@UnifiedAttendance/api/validations/clients";
import { route } from "@/lib/route";

export const DELETE = route({
  input: clientResourceIdInput,
  handler: ({ ctx, input }) => deleteClient(ctx, input),
});
