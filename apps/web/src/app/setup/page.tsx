import { redirect } from "next/navigation";

import { SetupForm } from "@/components/setup-form";
import { loadAccess } from "@/lib/access-server";
import { getBrand } from "@/lib/brand";
import { getSetupStatus } from "@/lib/setup-status";

export default async function SetupPage() {
  const [{ access }, brand, setup] = await Promise.all([loadAccess(), getBrand(), getSetupStatus()]);
  if (!access.role || !["Admin", "Super Administrator"].includes(access.role)) redirect("/no-access");
  if (setup.complete) redirect("/dashboard");
  return <SetupForm brand={brand} />;
}
