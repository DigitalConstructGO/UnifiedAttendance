"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";

type Props = {
  error: Error & { digest?: string };
  reset: () => void;
  returnHref: Route;
  returnLabel: string;
};

export function ErrorRecovery({ error, reset, returnHref, returnLabel }: Props) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section
      className="mx-auto flex min-h-72 max-w-xl flex-col justify-center px-6"
      aria-live="assertive"
    >
      <p className="text-xs font-semibold tracking-[0.08em] text-muted-foreground uppercase">
        Something went wrong
      </p>
      <h1
        ref={headingRef}
        tabIndex={-1}
        className="text-strong mt-2 font-heading text-3xl font-bold tracking-[-0.03em] outline-none"
      >
        We could not load this page
      </h1>
      <p className="mt-3 text-sm text-muted-foreground">
        Your information has not been changed. Try again, or return to a working page.
      </p>
      {error.digest ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Reference: <code>{error.digest}</code>
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        <Button asChild type="button" variant="outline">
          <Link href={returnHref}>{returnLabel}</Link>
        </Button>
      </div>
    </section>
  );
}
