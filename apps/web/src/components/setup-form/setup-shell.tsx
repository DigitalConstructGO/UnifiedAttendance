import { ArrowLeft, ArrowRight, Check, Fingerprint, LoaderCircle } from "lucide-react";
import type React from "react";

import { BrandMark } from "@/components/brand-mark";
import { RequestErrorAlert } from "@/components/request-error-alert";
import { Button } from "@/components/ui/button";
import type { Brand } from "@/lib/brand";
import type { RequestErrorPresentation } from "@/lib/errors";
import { SETUP_STEPS } from "./setup-model";

type Props = {
  brand: Brand;
  step: number;
  canContinue: boolean;
  isSubmitting: boolean;
  error: RequestErrorPresentation | null;
  onStep: (step: number) => void;
  onBack: () => void;
  onContinue: () => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  children: React.ReactNode;
};

export function SetupShell({
  brand,
  step,
  canContinue,
  isSubmitting,
  error,
  onStep,
  onBack,
  onContinue,
  onSubmit,
  children,
}: Props) {
  return (
    <main className="grid min-h-svh grid-rows-[64px_minmax(0,1fr)_72px] bg-[var(--surface-subtle)]">
      <header className="flex items-center gap-3 border-b border-border bg-card px-4 sm:px-6">
        <BrandMark brand={brand} className="size-9" iconClassName="size-[18px]" />
        <div className="min-w-0">
          <p className="text-strong truncate font-heading text-sm font-bold">
            New organization setup
          </p>
          <p className="truncate text-[0.6875rem] text-muted-foreground">
            {brand.name} · Guided onboarding
          </p>
        </div>
        <div className="ml-auto rounded-[9px] bg-accent px-2.5 py-1 text-[0.6875rem] font-bold text-accent-foreground">
          Step {step + 1} of {SETUP_STEPS.length}
        </div>
      </header>

      <form
        id="setup-form"
        onSubmit={onSubmit}
        className="grid min-h-0 md:grid-cols-[17.5rem_minmax(0,1fr)]"
      >
        <aside className="border-b border-border bg-card px-4 py-3 md:border-r md:border-b-0 md:py-6">
          <p className="hidden px-2 text-[0.625rem] font-bold tracking-[0.08em] text-muted-foreground uppercase md:block">
            Setup steps
          </p>
          <ol
            className="flex gap-2 overflow-x-auto md:mt-3 md:flex-col"
            aria-label="Setup progress"
          >
            {SETUP_STEPS.map((label, index) => {
              const complete = index < step;
              const active = index === step;
              return (
                <li key={label} className="shrink-0 md:w-full">
                  <button
                    type="button"
                    disabled={index > step}
                    onClick={() => onStep(index)}
                    className={`flex min-h-11 w-full items-center gap-3 rounded-[11px] px-3 text-left text-xs font-bold transition-colors ${active ? "text-strong bg-accent" : complete ? "text-strong hover:bg-muted" : "text-muted-foreground disabled:opacity-60"}`}
                    aria-current={active ? "step" : undefined}
                  >
                    <span
                      className={`grid size-7 shrink-0 place-items-center rounded-full font-numeric text-[0.6875rem] ${complete ? "bg-primary text-primary-foreground" : active ? "bg-sidebar text-white" : "bg-muted text-muted-foreground"}`}
                    >
                      {complete ? <Check className="size-4" /> : index + 1}
                    </span>
                    <span className="hidden md:block">{label}</span>
                  </button>
                </li>
              );
            })}
          </ol>
          <div className="mt-5 hidden md:block">
            <div className="h-1 overflow-hidden rounded-full bg-muted">
              <div
                className="h-full bg-primary transition-[width] duration-300"
                style={{ width: `${((step + 1) / SETUP_STEPS.length) * 100}%` }}
              />
            </div>
            <p className="mt-2 text-[0.6875rem] font-semibold text-muted-foreground">
              {Math.round(((step + 1) / SETUP_STEPS.length) * 100)}% complete
            </p>
          </div>
        </aside>

        <div className="min-h-0 overflow-y-auto px-4 py-8 sm:px-8 md:px-12 lg:px-16">
          <div className="mx-auto max-w-[680px]">
            <p className="text-[0.6875rem] font-bold tracking-[0.07em] text-workflow uppercase">
              Step {step + 1} of {SETUP_STEPS.length}
            </p>
            {children}
            {error ? <RequestErrorAlert error={error} className="mt-5" focusOnError /> : null}
          </div>
        </div>
      </form>

      <footer className="flex items-center justify-end gap-3 border-t border-border bg-card px-4 sm:px-6">
        {step > 0 ? (
          <Button
            type="button"
            variant="outline"
            onClick={onBack}
            className="h-11 rounded-[11px] px-4 font-bold"
          >
            <ArrowLeft className="size-4" />
            Back
          </Button>
        ) : null}
        {step < SETUP_STEPS.length - 1 ? (
          <Button
            type="button"
            disabled={!canContinue}
            onClick={onContinue}
            className="h-11 min-w-32 rounded-[11px] px-5 font-bold shadow-[var(--shadow-action)]"
          >
            Continue
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button
            form="setup-form"
            type="submit"
            disabled={isSubmitting}
            className="h-11 min-w-44 rounded-[11px] px-5 font-bold shadow-[var(--shadow-action)]"
          >
            {isSubmitting ? (
              <>
                <LoaderCircle className="animate-spin" />
                Creating…
              </>
            ) : (
              <>
                <Fingerprint />
                Create workspace
              </>
            )}
          </Button>
        )}
      </footer>
    </main>
  );
}
