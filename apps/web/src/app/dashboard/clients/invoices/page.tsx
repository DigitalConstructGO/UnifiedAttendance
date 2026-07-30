import { ModulePlaceholder } from "@/components/module-placeholder";
import { requireAccess } from "@/lib/access-server";

export default async function ClientInvoicesPage() {
  const { access } = await requireAccess("clients:read");

  return (
    <ModulePlaceholder
      title="Invoices"
      description="Payment requests issued to clients, with their issue and due dates, amount, and billing state. Awaiting the billing service."
      role={access.role}
    />
  );
}
