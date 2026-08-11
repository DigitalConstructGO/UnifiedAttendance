import { OrganizationWorkspace } from "@/components/organization-workspace";
import { requireAccess } from "@/lib/access-server";

export default async function OrganizationPage() {
  await requireAccess("organization.update");
  return <OrganizationWorkspace />;
}
