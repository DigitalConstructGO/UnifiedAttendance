import { getInvoice, updateInvoice } from "@UnifiedAttendance/api";
import {
  clientResourceIdInput,
  updateInvoiceInput,
} from "@UnifiedAttendance/api/validations/clients";

import { route } from "@/lib/route";

export const GET = route({
  input: clientResourceIdInput,
  handler: ({ ctx, input }) => getInvoice(ctx, input),
});

export const PATCH = route({
  input: updateInvoiceInput,
  handler: ({ ctx, input }) => updateInvoice(ctx, input),
});
