import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-svh place-items-center bg-[var(--surface-subtle)] px-6">
      <section className="max-w-md text-center">
        <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
          404
        </p>
        <h1 className="text-strong mt-2 font-heading text-3xl font-bold tracking-[-0.03em]">
          This page is not available
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          The address may be incorrect, or the page may no longer exist.
        </p>
        <Button asChild className="mt-6">
          <Link href="/dashboard">Go to dashboard</Link>
        </Button>
      </section>
    </main>
  );
}
