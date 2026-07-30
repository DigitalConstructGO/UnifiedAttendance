import { DepartmentWorkspace } from "@/components/department-workspace";
import { requireAccess } from "@/lib/access-server";

export default async function DepartmentsPage() {
  await requireAccess("workforce:read");
  return <DepartmentWorkspace />;
}
