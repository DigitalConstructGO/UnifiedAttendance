import { ClientRevenue } from "@/components/client-revenue";
import { requireAccess } from "@/lib/access-server";

export default async function ClientRevenuePage() {
  await requireAccess("clients.read");
  return <ClientRevenue />;
}
