import { restoreProject } from "@UnifiedAttendance/api";
import { clientResourceIdInput } from "@UnifiedAttendance/api/validations/clients";
import { route } from "@/lib/route";

export const POST = route({
  input: clientResourceIdInput,
  handler: ({ ctx, input }) => restoreProject(ctx, input),
});
