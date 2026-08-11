import { OpportunityProfile } from "@/components/opportunity-profile";
import { isOpportunityTab } from "@/components/opportunity-profile/model";
import { requireAccess } from "@/lib/access-server";

export default async function OpportunityProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ opportunityId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  await requireAccess("clients.read");
  const { opportunityId } = await params;
  const { tab } = await searchParams;
  return (
    <OpportunityProfile
      opportunityId={opportunityId}
      tab={isOpportunityTab(tab) ? tab : "overview"}
    />
  );
}
