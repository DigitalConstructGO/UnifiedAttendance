import { ModulePlaceholder } from "@/components/module-placeholder";
import { requireAccess } from "@/lib/access-server";

export default async function DevicesPage() {
  const { access } = await requireAccess("devices:read");

  return (
    <ModulePlaceholder
      title="Devices"
      description="Attendance devices and their employee enrolments."
      role={access.role}
    />
  );
}
