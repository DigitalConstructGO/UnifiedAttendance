"use client";

import { RefreshCw } from "lucide-react";
import { useEffect, useRef } from "react";

import { Button } from "@/components/ui/button";
import type { RequestErrorPresentation } from "@/lib/errors";

type Props = {
  error: RequestErrorPresentation;
  onRetry?: () => void;
  focusOnError?: boolean;
  className?: string;
};

/** Presents normalized request failures consistently, including validation and support context. */
export function RequestErrorAlert({ error, onRetry, focusOnError = false, className = "" }: Props) {
  const alertRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (focusOnError) alertRef.current?.focus();
  }, [error, focusOnError]);

  const canRetry = error.retryable && onRetry !== undefined;

  return (
    <div
      ref={alertRef}
      tabIndex={-1}
      role="alert"
      className={`rounded-[11px] bg-destructive/8 px-4 py-3 text-sm text-destructive ring-1 ring-destructive/20 ${className}`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <p>{error.message}</p>
        {canRetry ? (
          <Button type="button" size="sm" variant="destructive" onClick={onRetry}>
            <RefreshCw className="size-3.5" aria-hidden="true" />
            Retry
          </Button>
        ) : null}
      </div>
      {error.fieldErrors.length > 1 ? (
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs">
          {error.fieldErrors.slice(1).map((fieldError) => (
            <li key={`${fieldError.field}-${fieldError.message}`}>
              {fieldError.field}: {fieldError.message}
            </li>
          ))}
        </ul>
      ) : null}
      {error.requestId ? (
        <p className="mt-2 text-xs text-destructive/80">
          Reference: <code>{error.requestId}</code>
        </p>
      ) : null}
    </div>
  );
}
