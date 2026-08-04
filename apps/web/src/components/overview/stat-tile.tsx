import type { LucideIcon } from "lucide-react";

import { Skeleton } from "@/components/ui/skeleton";

export type Tone = "action" | "live" | "workflow" | "pending" | "failure";

const TONES: Record<Tone, string> = {
  action: "bg-primary/12 text-primary",
  live: "bg-success/10 text-success",
  workflow: "bg-workflow/10 text-workflow",
  pending: "bg-warning/12 text-warning",
  failure: "bg-destructive/10 text-destructive",
};

export function StatTile({
  label,
  value,
  unit,
  context,
  icon: Icon,
  tone = "workflow",
  loading = false,
}: {
  label: string;
  value: number | string;
  unit?: string;
  context: string;
  icon: LucideIcon;
  tone?: Tone;
  loading?: boolean;
}) {
  return (
    <article className="rounded-[18px] bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-border/80">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <span className={`grid size-9 shrink-0 place-items-center rounded-[11px] ${TONES[tone]}`}>
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
      </div>

      {loading ? (
        <>
          <Skeleton className="mt-4 h-8 w-20" />
          <Skeleton className="mt-2.5 h-3 w-28" />
        </>
      ) : (
        <>
          <p className="text-strong mt-3 flex items-baseline gap-1.5 font-numeric text-3xl font-bold tabular-nums">
            {value}
            {unit ? (
              <span className="font-heading text-sm font-semibold text-muted-foreground">
                {unit}
              </span>
            ) : null}
          </p>
          <p className="mt-1.5 text-xs text-muted-foreground">{context}</p>
        </>
      )}
    </article>
  );
}
