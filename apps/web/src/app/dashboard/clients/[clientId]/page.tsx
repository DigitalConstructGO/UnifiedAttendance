import { ClientProfile } from "@/components/client-profile";
import { isClientTab } from "@/components/client-profile/profile-model";
import { requireAccess } from "@/lib/access-server";

export default async function ClientProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ tab?: string; opportunityId?: string }>;
}) {
  await requireAccess("clients.read");
  const { clientId } = await params;
  const { tab, opportunityId } = await searchParams;
  return (
    <ClientProfile
      clientId={clientId}
      opportunityId={opportunityId}
      tab={isClientTab(tab) ? tab : "overview"}
    />
  );
}
