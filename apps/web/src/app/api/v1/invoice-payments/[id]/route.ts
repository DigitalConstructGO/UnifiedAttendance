import { deleteInvoicePayment, updateInvoicePayment } from "@UnifiedAttendance/api";
import {
  clientResourceIdInput,
  updateInvoicePaymentInput,
} from "@UnifiedAttendance/api/validations/clients";

import { route } from "@/lib/route";

export const PATCH = route({
  input: updateInvoicePaymentInput,
  handler: ({ ctx, input }) => updateInvoicePayment(ctx, input),
});

export const DELETE = route({
  input: clientResourceIdInput,
  handler: ({ ctx, input }) => deleteInvoicePayment(ctx, input),
});
