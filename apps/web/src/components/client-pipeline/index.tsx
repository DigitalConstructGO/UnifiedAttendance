"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore, Clock3, Columns3, GripVertical, Plus, Trash2 } from "lucide-react";
import type { Route } from "next";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAccess } from "@/components/access-provider";
import { RequestErrorAlert } from "@/components/request-error-alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  clientKeys,
  clientQueries,
  clientsApi,
  organizationQueries,
  workforceQueries,
  type OpportunityRow,
  type PipelineStage,
} from "@/lib/api";
import {
  clientName,
  initials,
  money,
  OPPORTUNITY_PRIORITY_META,
  personName,
} from "@/lib/client-presentation";
import { relativeTime } from "@/lib/format-date";
import { presentRequestError } from "@/lib/errors";
import { firstQueryFailure } from "@/lib/query-errors";

import { AddLeadDialog } from "./add-lead-dialog";
import { ManageStagesDialog } from "./manage-stages-dialog";

const STAGE_DOT_TONES = [
  "bg-muted-foreground",
  "bg-success",
  "bg-warning",
  "bg-workflow",
  "bg-destructive",
] as const;

const DRAG_MIME = "application/x-opportunity-id";

function OpportunityCard({
  row,
  stages,
  movable,
  archivable,
  dragging,
  onDragStart,
  onDragEnd,
  onMove,
  onArchive,
}: {
  row: OpportunityRow;
  stages: PipelineStage[];
  movable: boolean;
  archivable: boolean;
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (toPipelineStageId: string) => void;
  onArchive: () => void;
}) {
  const priority = OPPORTUNITY_PRIORITY_META[row.opportunity.priority];
  const name = row.client ? clientName(row.client) : row.opportunity.name;
  const detailHref = row.client
    ? `/dashboard/clients/${row.client.id}?opportunityId=${row.opportunity.id}`
    : `/dashboard/clients/opportunities/${row.opportunity.id}`;

  return (
    <article
      draggable={movable}
      onDragStart={(event) => {
        event.dataTransfer.setData(DRAG_MIME, row.opportunity.id);
        event.dataTransfer.effectAllowed = "move";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`rounded-[13px] bg-card p-3.5 shadow-[var(--shadow-card)] ring-1 ring-border transition-all ${
        dragging ? "opacity-40" : "hover:shadow-[var(--shadow-action)]"
      } ${movable ? "cursor-grab active:cursor-grabbing" : ""}`}
    >
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-workflow/90 text-[0.6875rem] font-bold text-white"
        >
          {initials(name)}
        </span>
        <div className="min-w-0 flex-1">
          <Link
            href={detailHref as Route}
            className="text-strong block truncate text-xs font-bold hover:underline"
          >
            {name}
          </Link>
          <p className="truncate text-[0.6875rem] text-muted-foreground">
            {row.industry?.name ?? "No industry"}
          </p>
        </div>
        {archivable ? (
          <Button
            size="icon-sm"
            variant="ghost"
            aria-label={`Remove ${name} from the pipeline`}
            className="-mt-1 -mr-1 shrink-0 text-muted-foreground"
            onClick={onArchive}
          >
            <Archive aria-hidden="true" />
          </Button>
        ) : null}
        {movable ? (
          <GripVertical className="size-4 shrink-0 text-muted-foreground/50" aria-hidden="true" />
        ) : null}
      </div>

      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-strong text-xs font-bold">
          {money(row.opportunity.estimatedValue, row.opportunity.currency ?? "ETB")}
        </p>
        <span className={`rounded-md px-2 py-1 text-[0.6875rem] font-bold ${priority.className}`}>
          {priority.label}
        </span>
      </div>

      <div className="mt-3 flex items-center gap-2 border-t border-border pt-2.5 text-[0.6875rem] text-muted-foreground">
        <span
          aria-hidden="true"
          className="grid size-5 shrink-0 place-items-center rounded bg-muted text-[0.6875rem] font-bold"
        >
          {initials(personName(row.owner.person))}
        </span>
        <span className="sr-only">Owner {personName(row.owner.person)}, last activity</span>
        <Clock3 className="size-3" aria-hidden="true" />
        {relativeTime(row.opportunity.lastActivityAt ?? row.opportunity.createdAt)}
      </div>

      {movable ? (
        <label className="mt-2.5 block">
          <span className="sr-only">Move {name} to stage</span>
          <select
            value={row.opportunity.pipelineStageId}
            onChange={(event) => onMove(event.target.value)}
            className="h-8 w-full rounded-[9px] border border-input bg-[var(--surface-subtle)] px-2 text-[0.6875rem] text-muted-foreground outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
          >
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </article>
  );
}

export function ClientPipeline({ createOpen = false }: { createOpen?: boolean }) {
  const { can } = useAccess();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [dialogOpen, setDialogOpen] = useState(createOpen && can("opportunities.create"));
  const [stagesOpen, setStagesOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [deleting, setDeleting] = useState<OpportunityRow | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overStageId, setOverStageId] = useState<string | null>(null);

  const opportunitiesOptions = clientQueries.opportunities({ includeClosed: "true" });
  const stagesQuery = useQuery(clientQueries.pipelineStages());
  const opportunitiesQuery = useQuery(opportunitiesOptions);
  const archivedQuery = useQuery({
    ...clientQueries.opportunities({ includeClosed: "true", archived: "true" }),
    enabled: showArchived,
  });
  const branchesQuery = useQuery(organizationQueries.branches());
  const industriesQuery = useQuery(clientQueries.industries());
  const clientsQuery = useQuery(clientQueries.list({ pageSize: 100 }));
  const branchId = branchesQuery.data?.[0]?.id ?? "";
  const employeesQuery = useQuery(workforceQueries.employees(branchId));

  const creatable = can("opportunities.create");
  const manageable = can("opportunities.move_stage");
  const archivable = can("opportunities.archive");
  const restorable = can("opportunities.restore");
  const deletable = can("opportunities.delete");
  const allStages = stagesQuery.data ?? [];
  // Inactive stages stay in history but leave the board.
  const stages = allStages.filter((stage) => stage.status === "active");
  const configurable = can("client_catalogs.manage");
  const opportunities = opportunitiesQuery.data ?? [];

  const createLead = useMutation({
    mutationFn: clientsApi.createOpportunity,
    onSuccess: async (created) => {
      setDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: clientKeys.opportunitiesAll });
      router.push(`/dashboard/clients/opportunities/${created.opportunity.id}`);
    },
  });

  const moveStage = useMutation({
    mutationFn: clientsApi.transitionStage,
    onMutate: async ({ id, toPipelineStageId }) => {
      await queryClient.cancelQueries({ queryKey: opportunitiesOptions.queryKey });
      const previous = queryClient.getQueryData(opportunitiesOptions.queryKey);
      queryClient.setQueryData(opportunitiesOptions.queryKey, (current?: OpportunityRow[]) =>
        current?.map((row) =>
          row.opportunity.id === id
            ? { ...row, opportunity: { ...row.opportunity, pipelineStageId: toPipelineStageId } }
            : row,
        ),
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(opportunitiesOptions.queryKey, context.previous);
      }
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: clientKeys.opportunitiesAll }),
  });

  async function invalidateLeads() {
    await queryClient.invalidateQueries({ queryKey: clientKeys.opportunitiesAll });
  }

  const archiveLead = useMutation({
    mutationFn: clientsApi.archiveOpportunity,
    onSuccess: invalidateLeads,
  });
  const restoreLead = useMutation({
    mutationFn: clientsApi.restoreOpportunity,
    onSuccess: invalidateLeads,
  });
  const deleteLead = useMutation({
    mutationFn: clientsApi.deleteOpportunity,
    onSuccess: invalidateLeads,
  });

  function moveTo(opportunityId: string, toPipelineStageId: string) {
    if (!manageable) return;
    const current = opportunities.find((row) => row.opportunity.id === opportunityId);
    if (!current || current.opportunity.pipelineStageId === toPipelineStageId) return;
    moveStage.mutate({ id: opportunityId, toPipelineStageId });
  }

  const loadFailure = firstQueryFailure([
    [stagesQuery, "Could not load pipeline stages."],
    [opportunitiesQuery, "Could not load opportunities."],
    [archivedQuery, "Could not load archived leads."],
  ]);
  const writeError = moveStage.error
    ? presentRequestError(moveStage.error, "Could not move this opportunity.")
    : archiveLead.error
      ? presentRequestError(archiveLead.error, "Could not remove this lead.")
      : restoreLead.error
        ? presentRequestError(restoreLead.error, "Could not restore this lead.")
        : deleteLead.error
          ? presentRequestError(deleteLead.error, "Could not delete this lead.")
          : null;
  const error = writeError ?? loadFailure?.error ?? null;

  function closeDialog() {
    createLead.reset();
    setDialogOpen(false);
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-strong font-heading text-2xl font-bold tracking-[-0.03em]">
            Leads &amp; pipeline
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {manageable
              ? "Drag a card to move it between stages, or use the stage picker on the card."
              : "Every open opportunity by stage. Select a card to open its client."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {archivable || restorable ? (
            <Button
              variant="outline"
              className="h-10 rounded-[11px] px-4 font-bold"
              aria-pressed={showArchived}
              onClick={() => setShowArchived((current) => !current)}
            >
              <Archive aria-hidden="true" />
              {showArchived ? "Back to pipeline" : "Archived leads"}
            </Button>
          ) : null}
          {configurable ? (
            <Button
              variant="outline"
              className="h-10 rounded-[11px] px-4 font-bold"
              onClick={() => setStagesOpen(true)}
            >
              <Columns3 aria-hidden="true" />
              Manage stages
            </Button>
          ) : null}
          {creatable ? (
            <Button
              className="h-10 rounded-[11px] px-4 font-bold"
              onClick={() => {
                createLead.reset();
                setDialogOpen(true);
              }}
            >
              <Plus aria-hidden="true" />
              New lead
            </Button>
          ) : null}
        </div>
      </header>

      {error ? <RequestErrorAlert error={error} onRetry={loadFailure?.retry} /> : null}

      {showArchived ? (
        <section
          aria-label="Archived leads"
          className="rounded-[15px] bg-[var(--surface-subtle)] p-3"
        >
          <ul className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {(archivedQuery.data ?? []).map((row) => {
              const name = row.client ? clientName(row.client) : row.opportunity.name;
              return (
                <li
                  key={row.opportunity.id}
                  className="rounded-[13px] bg-card p-3.5 shadow-[var(--shadow-card)] ring-1 ring-border"
                >
                  <div className="flex items-start gap-2.5">
                    <span
                      aria-hidden="true"
                      className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-muted text-[0.6875rem] font-bold text-muted-foreground"
                    >
                      {initials(name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-strong truncate text-xs font-bold">{name}</p>
                      <p className="truncate text-[0.6875rem] text-muted-foreground">
                        {money(row.opportunity.estimatedValue, row.opportunity.currency ?? "ETB")}
                        {" · removed "}
                        {relativeTime(row.opportunity.archivedAt ?? row.opportunity.updatedAt)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex gap-2 border-t border-border pt-2.5">
                    {restorable ? (
                      <Button
                        size="xs"
                        variant="outline"
                        disabled={restoreLead.isPending}
                        onClick={() => restoreLead.mutate(row.opportunity.id)}
                      >
                        <ArchiveRestore aria-hidden="true" />
                        Restore
                      </Button>
                    ) : null}
                    {deletable ? (
                      <Button
                        size="xs"
                        variant="destructive"
                        disabled={deleteLead.isPending}
                        onClick={() => setDeleting(row)}
                      >
                        <Trash2 aria-hidden="true" />
                        Delete
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
          {(archivedQuery.data ?? []).length === 0 && !archivedQuery.isPending ? (
            <p className="px-1 py-8 text-center text-sm text-muted-foreground">
              No archived leads. Remove a lead from the board and it waits here to be restored or
              deleted.
            </p>
          ) : null}
        </section>
      ) : (
      <div className="relative">
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max items-start gap-4">
          {stages.map((stage, stageIndex) => {
            const cards = opportunities.filter(
              (row) => row.opportunity.pipelineStageId === stage.id,
            );
            const isDropTarget = overStageId === stage.id && draggingId !== null;
            return (
              <section
                key={stage.id}
                aria-label={stage.name}
                onDragOver={(event) => {
                  if (!manageable || !event.dataTransfer.types.includes(DRAG_MIME)) return;
                  event.preventDefault();
                  event.dataTransfer.dropEffect = "move";
                  setOverStageId(stage.id);
                }}
                onDragLeave={() =>
                  setOverStageId((current) => (current === stage.id ? null : current))
                }
                onDrop={(event) => {
                  event.preventDefault();
                  const id = event.dataTransfer.getData(DRAG_MIME);
                  setOverStageId(null);
                  setDraggingId(null);
                  if (id) moveTo(id, stage.id);
                }}
                className={`w-72 shrink-0 rounded-[15px] p-3 transition-colors ${
                  isDropTarget
                    ? "bg-primary/8 ring-2 ring-primary/40"
                    : "bg-[var(--surface-subtle)] ring-2 ring-transparent"
                }`}
              >
                <header className="flex items-center justify-between gap-2 px-1 pb-3">
                  <h2 className="text-strong flex items-center gap-2 text-xs font-bold">
                    <span
                      aria-hidden="true"
                      className={`size-2 rounded-full ${STAGE_DOT_TONES[stageIndex % STAGE_DOT_TONES.length]}`}
                    />
                    {stage.name}
                  </h2>
                  <span className="rounded-full bg-card px-2 py-0.5 text-[0.6875rem] font-bold text-muted-foreground">
                    {cards.length}
                  </span>
                </header>
                <div className="grid gap-2.5">
                  {cards.map((row) => (
                    <OpportunityCard
                      key={row.opportunity.id}
                      row={row}
                      stages={stages}
                      movable={manageable}
                      archivable={archivable}
                      onArchive={() => archiveLead.mutate(row.opportunity.id)}
                      dragging={draggingId === row.opportunity.id}
                      onDragStart={() => setDraggingId(row.opportunity.id)}
                      onDragEnd={() => {
                        setDraggingId(null);
                        setOverStageId(null);
                      }}
                      onMove={(toPipelineStageId) => moveTo(row.opportunity.id, toPipelineStageId)}
                    />
                  ))}
                  {cards.length === 0 ? (
                    <p className="px-1 py-6 text-center text-[0.6875rem] text-muted-foreground">
                      {isDropTarget ? "Drop to move here." : "Nothing at this stage."}
                    </p>
                  ) : null}
                </div>
              </section>
            );
          })}
          {stages.length === 0 && !stagesQuery.isPending ? (
            <p className="text-sm text-muted-foreground">No pipeline stages configured yet.</p>
          ) : null}
          </div>
        </div>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent sm:hidden"
        />
      </div>
      )}

      {deleting ? (
        <ConfirmDialog
          title={`Delete lead ${deleting.client ? clientName(deleting.client) : deleting.opportunity.name}?`}
          description="The lead and its stage history are removed for good."
          confirmLabel="Delete lead"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleteLead.mutate(deleting.opportunity.id);
            setDeleting(null);
          }}
        />
      ) : null}

      {dialogOpen ? (
        <AddLeadDialog
          branches={branchesQuery.data ?? []}
          industries={industriesQuery.data ?? []}
          stages={stages.filter((stage) => stage.outcome === "open")}
          employees={employeesQuery.data ?? []}
          clients={clientsQuery.data?.items ?? []}
          busy={createLead.isPending}
          error={
            createLead.error
              ? presentRequestError(createLead.error, "Could not create the lead.")
              : null
          }
          onClose={closeDialog}
          onSubmit={(form) => {
            const data = new FormData(form);
            const industryId = String(data.get("industryId"));
            const clientId = String(data.get("clientId") ?? "");
            createLead.mutate({
              name: String(data.get("name")),
              clientId: clientId || null,
              industryId: industryId || null,
              ownerEmployeeId: String(data.get("ownerEmployeeId")),
              branchId: String(data.get("branchId")),
              pipelineStageId: String(data.get("pipelineStageId")),
            });
          }}
        />
      ) : null}

      {stagesOpen ? (
        <ManageStagesDialog stages={allStages} onClose={() => setStagesOpen(false)} />
      ) : null}
    </div>
  );
}
