import { redirect } from "next/navigation";

import { OrganizationWorkspace } from "@/components/organization-workspace";
import { loadAccess } from "@/lib/access-server";

export default async function OrganizationPage() {
  const { access } = await loadAccess();
  if (!access.role || !["Admin", "Super Administrator"].includes(access.role))
    redirect("/no-access");
  return <OrganizationWorkspace />;
}
