import { ResetPasswordForm } from "@/components/reset-password-form";
import { PublicShell } from "@/components/public-shell";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <PublicShell>
      <ResetPasswordForm token={token ?? null} />
    </PublicShell>
  );
}
