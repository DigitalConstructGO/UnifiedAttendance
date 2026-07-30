import { ClientPipeline } from "@/components/client-pipeline";
import { requireAccess } from "@/lib/access-server";

export default async function ClientPipelinePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string }>;
}) {
  await requireAccess("clients:read");
  const { view } = await searchParams;
  return <ClientPipeline createOpen={view === "create"} />;
}
