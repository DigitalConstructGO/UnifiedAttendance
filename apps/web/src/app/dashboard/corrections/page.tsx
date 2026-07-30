import { ModulePlaceholder } from "@/components/module-placeholder";
import { requireAccess } from "@/lib/access-server";

export default async function CorrectionsPage() {
  const { access } = await requireAccess("corrections:read");

  return (
    <ModulePlaceholder
      title="Corrections"
      description="Attendance correction requests and reviews."
      role={access.role}
    />
  );
}
