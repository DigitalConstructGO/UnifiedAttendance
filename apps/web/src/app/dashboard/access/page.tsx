import { redirect } from "next/navigation";

import { AccessWorkspace } from "@/components/access-workspace";
import { loadAccess } from "@/lib/access-server";

export default async function AccessPage() {
  const { access } = await loadAccess();
  if (access.role !== "Super Administrator") redirect("/no-access");
  return <AccessWorkspace />;
}
