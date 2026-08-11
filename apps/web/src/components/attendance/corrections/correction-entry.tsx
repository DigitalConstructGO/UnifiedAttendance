"use client";

import { Undo2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { CorrectionRow } from "@/lib/api";
import { formatDate } from "@/lib/format-date";

import { CORRECTION_TYPE_META } from "./correction-presentation";

function stamp(value: string | null, timeZone: string, withSeconds = false) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    ...(withSeconds ? { second: "2-digit" } : {}),
    hour12: true,
  }).format(new Date(value));
}

export function CorrectionEntry({
  correction,
  timeZone,
  manageable,
  busy,
  onUndo,
}: {
  correction: CorrectionRow;
  timeZone: string;
  manageable: boolean;
  busy: boolean;
  onUndo: () => void;
}) {
  const type = CORRECTION_TYPE_META[correction.type];
  const Icon = type.icon;

  return (
    <article className="grid gap-3 px-5 py-4">
      <div className="flex flex-wrap items-start gap-3">
        <span
          aria-hidden="true"
          className="grid size-9 shrink-0 place-items-center rounded-[9px] bg-workflow/10 text-workflow"
        >
          <Icon className="size-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
            <h3 className="text-strong text-sm font-bold">{type.label}</h3>
            <span className="font-heading text-xs font-semibold text-muted-foreground tabular-nums">
              {formatDate(correction.attendanceDate, timeZone)}
            </span>
          </div>

          {correction.proposedTime ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Set to{" "}
              <span className="text-strong font-heading font-semibold tabular-nums">
                {stamp(correction.proposedTime, timeZone, true)}
              </span>
            </p>
          ) : null}

          <p className="mt-2 text-xs leading-relaxed text-foreground">{correction.reason}</p>
        </div>

        {manageable ? (
          <Button
            type="button"
            variant="ghost"
            disabled={busy}
            onClick={onUndo}
            aria-label={`Undo ${type.label.toLowerCase()} on ${correction.attendanceDate}`}
            className="h-9 shrink-0 rounded-[9px] px-3 text-xs font-bold text-muted-foreground hover:bg-destructive/8 hover:text-destructive"
          >
            <Undo2 aria-hidden="true" />
            Undo
          </Button>
        ) : null}
      </div>

      <dl className="flex flex-wrap gap-x-6 gap-y-1 border-t border-border pt-3 text-[0.6875rem] text-muted-foreground">
        <div className="flex gap-1.5">
          <dt>Corrected by</dt>
          <dd className="font-semibold text-foreground">{correction.appliedByName}</dd>
          <dd className="font-heading font-semibold tabular-nums">
            {stamp(correction.appliedAt, timeZone)}
          </dd>
        </div>
      </dl>
    </article>
  );
}
