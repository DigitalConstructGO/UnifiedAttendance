import { Fingerprint } from "lucide-react";


export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid min-h-svh place-items-center bg-[var(--surface-subtle)] px-6"
    >
      <div className="flex flex-col items-center gap-5">
        <span className="grid size-12 place-items-center rounded-[11px] bg-primary text-primary-foreground shadow-[var(--shadow-action)] motion-safe:animate-pulse">
          <Fingerprint className="size-6" aria-hidden="true" />
        </span>

        <div className="flex flex-col items-center gap-3">
          
          <p className="font-heading text-sm font-bold tracking-[-0.02em] text-[var(--text-strong)]">
            Loading your workspace
          </p>
          <div className="flex gap-1.5" aria-hidden="true">
            {[0, 1, 2].map((dot) => (
              <span
                key={dot}
                className="size-1.5 rounded-full bg-primary/70 motion-safe:animate-pulse"
                style={{ animationDelay: `${dot * 160}ms` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
