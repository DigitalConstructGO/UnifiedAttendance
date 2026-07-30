import { createInvoice, listInvoices } from "@UnifiedAttendance/api";
import { createInvoiceInput, listInvoicesInput } from "@UnifiedAttendance/api/validations/clients";

import { route } from "@/lib/route";

export const GET = route({
  input: listInvoicesInput,
  handler: ({ ctx, input }) => listInvoices(ctx, input),
});

export const POST = route({
  input: createInvoiceInput,
  status: 201,
  handler: ({ ctx, input }) => createInvoice(ctx, input),
});
