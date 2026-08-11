import { redirect } from "next/navigation";

import { AccessWorkspace } from "@/components/access-workspace";
import { loadAccess } from "@/lib/access-server";

export default async function AccessPage() {
  const { access } = await loadAccess();
  // The access services themselves demand Super Administrator; gating the page
  // to the same role keeps a permitted-but-powerless visit from 403-ing.
  if (access.role !== "Super Administrator") redirect("/no-access");
  return <AccessWorkspace />;
}
