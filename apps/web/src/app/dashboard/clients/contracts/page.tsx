import { ClientContracts } from "@/components/client-agreements/contracts";
import { requireAccess } from "@/lib/access-server";

export default async function ClientContractsPage() {
  await requireAccess("clients:read");
  return <ClientContracts />;
}
