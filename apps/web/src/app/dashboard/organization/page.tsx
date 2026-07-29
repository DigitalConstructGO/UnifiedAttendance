import { ModulePlaceholder } from "@/components/module-placeholder";
import { requireAccess } from "@/lib/access-server";

export default async function OrganizationPage() {
  const { access } = await requireAccess("organization:read");

  return (
    <ModulePlaceholder
      title="Organization"
      description="Branches, working days and organization settings."
      role={access.role}
    />
  );
}
