import { issueInvoice } from "@UnifiedAttendance/api";
import { issueInvoiceInput } from "@UnifiedAttendance/api/validations/clients";

import { route } from "@/lib/route";

export const POST = route({
  input: issueInvoiceInput,
  handler: ({ ctx, input }) => issueInvoice(ctx, input),
});
