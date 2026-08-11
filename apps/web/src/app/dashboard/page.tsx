import { OperationsOverview } from "@/components/overview";
import { ModuleDirectory } from "@/components/overview/module-directory";
import { can } from "@/lib/access";
import { loadAccess } from "@/lib/access-server";

export default async function DashboardPage() {
  const { session, access } = await loadAccess();
  const firstName = session.user.name?.split(" ")[0] || "there";

  return can(access, "dashboard.read") ? (
    <OperationsOverview name={firstName} />
  ) : (
    <ModuleDirectory access={access} name={firstName} />
  );
}
