"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Clock3, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAccess } from "@/components/access-provider";
import { RequestErrorAlert } from "@/components/request-error-alert";
import { Button } from "@/components/ui/button";
import {
  clientKeys,
  clientQueries,
  clientsApi,
  organizationQueries,
  workforceQueries,
  type OpportunityRow,
} from "@/lib/api";
import { clientName, initials, money, OPPORTUNITY_PRIORITY_META } from "@/lib/client-presentation";
import { relativeTime } from "@/lib/ethiopian-date";
import { presentRequestError } from "@/lib/errors";
import { firstQueryFailure } from "@/lib/query-errors";

import { AddClientDialog } from "./add-client-dialog";

function OpportunityCard({ row }: { row: OpportunityRow }) {
  const priority = OPPORTUNITY_PRIORITY_META[row.opportunity.priority];
  const name = row.client ? clientName(row.client) : row.opportunity.name;
  const card = (
    <article className="rounded-[13px] bg-card p-3.5 shadow-[var(--shadow-card)] ring-1 ring-border transition-shadow hover:shadow-[var(--shadow-action)]">
      <div className="flex items-start gap-2.5">
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-workflow/90 text-[0.625rem] font-bold text-white"
        >
          {initials(name)}
        </span>
        <div className="min-w-0">
          <p className="text-strong truncate text-xs font-bold">{name}</p>
          <p className="truncate text-[0.6875rem] text-muted-foreground">
            {row.industry?.name ?? "No industry"}
          </p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2">
        <p className="text-strong text-xs font-bold">
          {money(row.opportunity.estimatedValue, row.opportunity.currency ?? "ETB")}
        </p>
        <span className={`rounded-md px-2 py-1 text-[0.625rem] font-bold ${priority.className}`}>
          {priority.label}
        </span>
      </div>
      <p className="mt-2.5 flex items-center gap-1.5 text-[0.6875rem] text-muted-foreground">
        <Clock3 className="size-3" aria-hidden="true" />
        {relativeTime(row.opportunity.lastActivityAt ?? row.opportunity.createdAt)}
      </p>
    </article>
  );

  // A converted opportunity opens its client; a prospect has nowhere to go yet.
  return row.client ? (
    <Link href={`/dashboard/clients/${row.client.id}`} className="block">
      {card}
    </Link>
  ) : (
    card
  );
}

export function ClientPipeline({ createOpen = false }: { createOpen?: boolean }) {
  const { can } = useAccess();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(createOpen);

  const stagesQuery = useQuery(clientQueries.pipelineStages());
  const opportunitiesQuery = useQuery(clientQueries.opportunities());
  const branchesQuery = useQuery(organizationQueries.branches());
  const industriesQuery = useQuery(clientQueries.industries());
  const clientTypesQuery = useQuery(clientQueries.clientTypes());
  const branchId = branchesQuery.data?.[0]?.id ?? "";
  const employeesQuery = useQuery(workforceQueries.employees(branchId));

  const createClient = useMutation({
    mutationFn: clientsApi.create,
    onSuccess: async (created) => {
      setDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: clientKeys.all });
      router.push(`/dashboard/clients/${created.client.id}`);
    },
  });

  const loadFailure = firstQueryFailure([
    [stagesQuery, "Could not load pipeline stages."],
    [opportunitiesQuery, "Could not load opportunities."],
  ]);
  const stages = stagesQuery.data ?? [];
  const opportunities = opportunitiesQuery.data ?? [];

  function closeDialog() {
    createClient.reset();
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
            Every open opportunity by stage. Select a card to open its client.
          </p>
        </div>
        {can("clients:manage") ? (
          <Button
            className="h-10 rounded-[11px] px-4 font-bold"
            onClick={() => {
              createClient.reset();
              setDialogOpen(true);
            }}
          >
            <Plus aria-hidden="true" />
            Add client
          </Button>
        ) : null}
      </header>

      {loadFailure ? (
        <RequestErrorAlert error={loadFailure.error} onRetry={loadFailure.retry} />
      ) : null}

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max items-start gap-4">
          {stages.map((stage) => {
            const cards = opportunities.filter(
              (row) => row.opportunity.pipelineStageId === stage.id,
            );
            return (
              <section
                key={stage.id}
                aria-label={stage.name}
                className="w-72 shrink-0 rounded-[15px] bg-[var(--surface-subtle)] p-3"
              >
                <header className="flex items-center justify-between gap-2 px-1 pb-3">
                  <h2 className="text-strong flex items-center gap-2 text-xs font-bold">
                    <span aria-hidden="true" className="size-2 rounded-full bg-workflow" />
                    {stage.name}
                  </h2>
                  <span className="rounded-full bg-card px-2 py-0.5 text-[0.625rem] font-bold text-muted-foreground">
                    {cards.length}
                  </span>
                </header>
                <div className="grid gap-2.5">
                  {cards.map((row) => (
                    <OpportunityCard key={row.opportunity.id} row={row} />
                  ))}
                  {cards.length === 0 ? (
                    <p className="px-1 py-6 text-center text-[0.6875rem] text-muted-foreground">
                      Nothing at this stage.
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

      {dialogOpen ? (
        <AddClientDialog
          branches={branchesQuery.data ?? []}
          industries={industriesQuery.data ?? []}
          clientTypes={clientTypesQuery.data ?? []}
          employees={employeesQuery.data ?? []}
          busy={createClient.isPending}
          error={
            createClient.error
              ? presentRequestError(createClient.error, "Could not create the client.")
              : null
          }
          onClose={closeDialog}
          onSubmit={(form) => {
            const data = new FormData(form);
            createClient.mutate({
              legalName: String(data.get("legalName")),
              industryId: String(data.get("industryId")),
              clientTypeId: String(data.get("clientTypeId")),
              ownerEmployeeId: String(data.get("ownerEmployeeId")),
              branchId: String(data.get("branchId")),
              phone: String(data.get("phone")) || null,
              email: String(data.get("email")) || null,
            });
          }}
        />
      ) : null}
    </div>
  );
}
