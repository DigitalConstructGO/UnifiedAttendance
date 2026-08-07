import { EmployeeProfile } from "@/components/employee/employee-profile";
import { requireAccess } from "@/lib/access-server";

export default async function EmployeeProfilePage({
  params,
}: {
  params: Promise<{ employeeId: string }>;
}) {
  await requireAccess("workforce:read");
  const { employeeId } = await params;
  return <EmployeeProfile employeeId={employeeId} />;
}
