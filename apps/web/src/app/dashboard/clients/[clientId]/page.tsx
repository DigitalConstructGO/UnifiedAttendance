import { ClientProfile, isClientTab } from "@/components/client-profile";
import { requireAccess } from "@/lib/access-server";

export default async function ClientProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ clientId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAccess("clients:read");
  const { clientId } = await params;
  const { tab } = await searchParams;
  return <ClientProfile clientId={clientId} tab={isClientTab(tab) ? tab : "overview"} />;
}
