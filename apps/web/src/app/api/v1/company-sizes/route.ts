import { createCompanySize, listCompanySizes } from "@UnifiedAttendance/api";
import { createCompanySizeInput } from "@UnifiedAttendance/api/validations/clients";
import { route } from "@/lib/route";

export const GET = route({ handler: ({ ctx }) => listCompanySizes(ctx) });

export const POST = route({
  input: createCompanySizeInput,
  status: 201,
  handler: ({ ctx, input }) => createCompanySize(ctx, input),
});
