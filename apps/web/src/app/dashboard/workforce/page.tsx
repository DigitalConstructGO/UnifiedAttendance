import { ModulePlaceholder } from "@/components/module-placeholder";
import { requireAccess } from "@/lib/access-server";

export default async function WorkforcePage() {
  const { access } = await requireAccess("workforce:read");

  return (
    <ModulePlaceholder
      title="Workforce"
      description="Employees, departments and cosigners."
      role={access.role}
    />
  );
}
