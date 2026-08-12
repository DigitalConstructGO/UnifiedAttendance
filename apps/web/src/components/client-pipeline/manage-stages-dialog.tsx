"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Columns3, Plus, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { RequestErrorAlert } from "@/components/request-error-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clientKeys, clientsApi, type PipelineStage } from "@/lib/api";
import { presentRequestError } from "@/lib/errors";

import { dialogFieldClass } from "../client-agreements/record-dialog";

const OUTCOME_LABELS = { open: "Open", won: "Won", lost: "Lost" } as const;
type StageOutcome = keyof typeof OUTCOME_LABELS;

export function ManageStagesDialog({
  stages,
  onClose,
}: {
  stages: PipelineStage[];
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const dialogRef = useRef<HTMLDivElement>(null);
  const ordered = [...stages].sort((a, b) => a.position - b.position);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(
          "button:not([disabled]), input:not([disabled]), select:not([disabled])",
        ),
      );
      if (focusable.length === 0) return;
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

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: clientKeys.pipelineStages });
  }

  const createStage = useMutation({
    mutationFn: clientsApi.createPipelineStage,
    onSuccess: refresh,
  });

  const saveStage = useMutation({
    mutationFn: clientsApi.updatePipelineStage,
    onSuccess: refresh,
  });

  // Positions are unique, so a swap parks one stage out of the way first.
  const swapStages = useMutation({
    mutationFn: async ({ a, b }: { a: PipelineStage; b: PipelineStage }) => {
      const parking = Math.max(...stages.map((stage) => stage.position)) + 1000;
      await clientsApi.updatePipelineStage({ id: a.id, position: parking });
      await clientsApi.updatePipelineStage({ id: b.id, position: a.position });
      await clientsApi.updatePipelineStage({ id: a.id, position: b.position });
    },
    onSuccess: refresh,
  });

  const busy = createStage.isPending || saveStage.isPending || swapStages.isPending;
  const error = createStage.error ?? saveStage.error ?? swapStages.error;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[oklch(0.2_0.05_265/0.55)] p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="manage-stages-title"
        tabIndex={-1}
        className="w-full max-w-2xl rounded-[18px] bg-card shadow-[var(--shadow-card)] ring-1 ring-border outline-none"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-6 py-5">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="grid size-10 place-items-center rounded-[11px] bg-workflow/10 text-workflow"
            >
              <Columns3 className="size-5" />
            </span>
            <div>
              <h2 id="manage-stages-title" className="text-strong font-heading text-base font-bold">
                Pipeline stages
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                The board's columns, in order. Open stages hold live leads; a Won or Lost stage
                closes them.
              </p>
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

        <div className="grid gap-3 px-6 py-5">
          {error ? (
            <RequestErrorAlert error={presentRequestError(error, "Could not save the stage.")} />
          ) : null}

          {ordered.map((stage, index) => (
            <form
              key={stage.id}
              className="flex flex-wrap items-center gap-2"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                saveStage.mutate({
                  id: stage.id,
                  name: String(data.get("name") ?? "").trim(),
                  outcome: String(data.get("outcome")) as StageOutcome,
                  status: String(data.get("status")) as "active" | "inactive",
                });
              }}
            >
              <div className="flex flex-col">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move ${stage.name} up`}
                  disabled={busy || index === 0}
                  className="size-6"
                  onClick={() => swapStages.mutate({ a: stage, b: ordered[index - 1]! })}
                >
                  <ArrowUp aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={`Move ${stage.name} down`}
                  disabled={busy || index === ordered.length - 1}
                  className="size-6"
                  onClick={() => swapStages.mutate({ a: stage, b: ordered[index + 1]! })}
                >
                  <ArrowDown aria-hidden="true" />
                </Button>
              </div>
              <Input
                required
                name="name"
                defaultValue={stage.name}
                aria-label={`Name of stage ${stage.name}`}
                className="min-w-32 flex-1"
              />
              <select
                name="outcome"
                defaultValue={stage.outcome}
                aria-label={`Outcome of stage ${stage.name}`}
                className={`${dialogFieldClass} w-24`}
              >
                {Object.entries(OUTCOME_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
              <select
                name="status"
                defaultValue={stage.status}
                aria-label={`Status of stage ${stage.name}`}
                className={`${dialogFieldClass} w-28`}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <Button
                variant="outline"
                size="sm"
                disabled={busy}
                className="h-10 rounded-[11px] px-3 font-bold"
              >
                Save
              </Button>
            </form>
          ))}

          <form
            className="mt-2 flex flex-wrap items-center gap-2 border-t border-border pt-4"
            onSubmit={(event) => {
              event.preventDefault();
              const form = event.currentTarget;
              const data = new FormData(form);
              const positions = stages.map((stage) => stage.position);
              createStage.mutate(
                {
                  name: String(data.get("name") ?? "").trim(),
                  outcome: String(data.get("outcome")) as StageOutcome,
                  position: (positions.length ? Math.max(...positions) : 0) + 1,
                },
                { onSuccess: () => form.reset() },
              );
            }}
          >
            <Input
              required
              name="name"
              placeholder="New stage name"
              aria-label="New stage name"
              className="min-w-32 flex-1"
            />
            <select name="outcome" defaultValue="open" className={`${dialogFieldClass} w-24`}>
              {Object.entries(OUTCOME_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <Button disabled={busy} className="h-10 rounded-[11px] px-4 font-bold">
              <Plus aria-hidden="true" />
              Add stage
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
