"use client";

import { ErrorRecovery } from "@/components/error-recovery";

export default function GlobalError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <main className="min-h-svh bg-[var(--surface-subtle)]">
      <ErrorRecovery error={error} reset={reset} returnHref="/" returnLabel="Go to home" />
    </main>
  );
}
