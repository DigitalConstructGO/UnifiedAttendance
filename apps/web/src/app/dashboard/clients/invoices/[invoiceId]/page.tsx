import { InvoiceDocument } from "@/components/client-billing/invoice-document";
import { requireAccess } from "@/lib/access-server";

export default async function InvoiceDocumentPage({
  params,
}: {
  params: Promise<{ invoiceId: string }>;
}) {
  await requireAccess("clients.read");
  const { invoiceId } = await params;
  return <InvoiceDocument invoiceId={invoiceId} />;
}
