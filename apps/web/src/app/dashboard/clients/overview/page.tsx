import { ClientOverview } from "@/components/client-overview";
import { requireAccess } from "@/lib/access-server";

export default async function ClientOverviewPage() {
  await requireAccess("clients:read");
  return <ClientOverview />;
}
