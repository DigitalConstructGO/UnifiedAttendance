import { ModulePlaceholder } from "@/components/module-placeholder";
import { requireAccess } from "@/lib/access-server";

export default async function AttendancePage() {
  const { access } = await requireAccess("attendance:read");

  return (
    <ModulePlaceholder
      title="Attendance"
      description="Daily attendance records and derived days."
      role={access.role}
    />
  );
}
