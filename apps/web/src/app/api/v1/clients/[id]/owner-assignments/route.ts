import { listClientOwnerAssignments } from "@UnifiedAttendance/api";
import { clientResourceIdInput } from "@UnifiedAttendance/api/validations/clients";
import { route } from "@/lib/route";

export const GET = route({
  input: clientResourceIdInput,
  handler: ({ ctx, input }) => listClientOwnerAssignments(ctx, input),
});
