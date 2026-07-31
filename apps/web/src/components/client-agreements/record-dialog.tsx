"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef } from "react";

import { RequestErrorAlert } from "@/components/request-error-alert";
import { Button } from "@/components/ui/button";
import type { RequestErrorPresentation } from "@/lib/errors";

export const dialogFieldClass =
  "h-10 w-full rounded-[11px] border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50";

export function DialogField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="text-strong grid gap-1.5 text-xs font-bold">
      {label}
      {children}
    </label>
  );
}

export function RecordDialog({
  title,
  description,
  icon,
  busy,
  submitLabel,
  error,
  onClose,
  onSubmit,
  children,
}: {
  title: string;
  description: string;
  icon: ReactNode;
  busy: boolean;
  submitLabel: string;
  error: RequestErrorPresentation | null;
  onClose: () => void;
  onSubmit: (form: HTMLFormElement) => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;

      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
        ),
      );
      if (focusable.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const first = focusable[0]!;
      const last = focusable.at(-1)!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[oklch(0.2_0.05_265/0.55)] p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="record-dialog-title"
        tabIndex={-1}
        className="w-full max-w-xl rounded-[18px] bg-card shadow-[var(--shadow-card)] ring-1 ring-border outline-none"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-6 py-5">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="grid size-10 place-items-center rounded-[11px] bg-success/10 text-success"
            >
              {icon}
            </span>
            <div>
              <h2 id="record-dialog-title" className="text-strong font-heading text-base font-bold">
                {title}
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={onClose}
            className="size-9 rounded-full"
          >
            <X aria-hidden="true" />
          </Button>
        </header>

        <form
          className="grid gap-4 px-6 py-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(event.currentTarget);
          }}
        >
          {children}

          {error ? <RequestErrorAlert error={error} focusOnError /> : null}

          <div className="mt-1 flex flex-wrap justify-end gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-[11px] px-5"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button disabled={busy} className="h-10 rounded-[11px] px-5 font-bold">
              {busy ? "Saving…" : submitLabel}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
