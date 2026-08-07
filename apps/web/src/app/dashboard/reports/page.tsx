import { ReportsWorkspace } from "@/components/reports";
import { requireAccess } from "@/lib/access-server";

export default async function ReportsPage() {
  await requireAccess("reports:read");

  return <ReportsWorkspace section="summary" />;
}
