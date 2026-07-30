import { recordInvoicePayment } from "@UnifiedAttendance/api";
import { recordInvoicePaymentInput } from "@UnifiedAttendance/api/validations/clients";

import { route } from "@/lib/route";

export const POST = route({
  input: recordInvoicePaymentInput,
  status: 201,
  handler: ({ ctx, input }) => recordInvoicePayment(ctx, input),
});
