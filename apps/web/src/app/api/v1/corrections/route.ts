import { createCorrection, listCorrections } from "@UnifiedAttendance/api";
import { createCorrectionInput, listCorrectionsInput } from "@UnifiedAttendance/api/validations/corrections";
import { route } from "@/lib/route";

export const GET = route({
  input: listCorrectionsInput,
  handler: ({ ctx, input }) => listCorrections(ctx, input),
});

export const POST = route({
  input: createCorrectionInput,
  status: 201,
  handler: ({ ctx, input }) => createCorrection(ctx, input),
});
