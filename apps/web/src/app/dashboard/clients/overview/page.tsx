import { ModulePlaceholder } from "@/components/module-placeholder";
import { requireAccess } from "@/lib/access-server";

export default async function ClientOverviewPage() {
  const { access } = await requireAccess("clients:read");

  return (
    <ModulePlaceholder
      title="Client dashboard"
      description="Invoiced and collected revenue, outstanding balances, active projects, and lead conversion. Awaiting the reporting read models."
      role={access.role}
    />
  );
}
