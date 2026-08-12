import { archiveProject } from "@UnifiedAttendance/api";
import { clientResourceIdInput } from "@UnifiedAttendance/api/validations/clients";
import { route } from "@/lib/route";

export const POST = route({
  input: clientResourceIdInput,
  handler: ({ ctx, input }) => archiveProject(ctx, input),
});
