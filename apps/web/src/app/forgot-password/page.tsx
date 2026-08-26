import { auth } from "@UnifiedAttendance/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { PublicShell } from "@/components/public-shell";

export default async function ForgotPasswordPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) redirect("/dashboard");

  return (
    <PublicShell>
      <ForgotPasswordForm />
    </PublicShell>
  );
}
