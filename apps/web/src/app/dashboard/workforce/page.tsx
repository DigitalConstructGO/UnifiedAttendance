import { WorkforceWorkspace } from "@/components/workforce-workspace";
import { requireAccess } from "@/lib/access-server";

export default async function WorkforcePage() {
  await requireAccess("workforce:read");
  return <WorkforceWorkspace />;
}
