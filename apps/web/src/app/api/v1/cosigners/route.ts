import { createCosigner, listCosigners } from "@UnifiedAttendance/api";
import { createCosignerInput } from "@UnifiedAttendance/api/validations/workforce";
import { route } from "@/lib/route";

export const GET = route({ handler: ({ ctx }) => listCosigners(ctx) });

export const POST = route({
  input: createCosignerInput,
  status: 201,
  handler: ({ ctx, input }) => createCosigner(ctx, input),
});
