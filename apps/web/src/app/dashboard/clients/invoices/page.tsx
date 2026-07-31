import { ClientInvoices } from "@/components/client-agreements/invoices";
import { requireAccess } from "@/lib/access-server";

export default async function ClientInvoicesPage() {
  await requireAccess("clients:read");
  return <ClientInvoices />;
}
