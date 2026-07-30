"use client";

import { ErrorRecovery } from "@/components/error-recovery";

export default function DashboardError({
  error,
  reset,
}: Readonly<{
  error: Error & { digest?: string };
  reset: () => void;
}>) {
  return (
    <ErrorRecovery
      error={error}
      reset={reset}
      returnHref="/dashboard"
      returnLabel="Go to dashboard"
    />
  );
}
