import { ClientDirectory } from "@/components/client-directory";
import { requireAccess } from "@/lib/access-server";

export default async function ClientsPage() {
  await requireAccess("clients.read");
  return <ClientDirectory />;
}
