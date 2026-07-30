import { ModulePlaceholder } from "@/components/module-placeholder";
import { requireAccess } from "@/lib/access-server";

export default async function ClientContractsPage() {
  const { access } = await requireAccess("clients:read");

  return (
    <ModulePlaceholder
      title="Contracts"
      description="Commercial agreements across every client. Each client's own contracts are on the Contracts tab of its profile."
      role={access.role}
    />
  );
}
