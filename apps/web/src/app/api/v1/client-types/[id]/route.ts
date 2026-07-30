import { updateClientType } from "@UnifiedAttendance/api";
import { updateCatalogInput } from "@UnifiedAttendance/api/validations/clients";
import { route } from "@/lib/route";

export const PATCH = route({
  input: updateCatalogInput,
  handler: ({ ctx, input }) => updateClientType(ctx, input),
});
