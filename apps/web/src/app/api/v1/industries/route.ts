import { createIndustry, listIndustries } from "@UnifiedAttendance/api";
import { createIndustryInput } from "@UnifiedAttendance/api/validations/clients";
import { route } from "@/lib/route";

export const GET = route({ handler: ({ ctx }) => listIndustries(ctx) });

export const POST = route({
  input: createIndustryInput,
  status: 201,
  handler: ({ ctx, input }) => createIndustry(ctx, input),
});
