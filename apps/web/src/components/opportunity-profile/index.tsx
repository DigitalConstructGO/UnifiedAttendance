"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Briefcase,
  CalendarDays,
  History,
  LoaderCircle,
  MapPin,
  PhoneCall,
  UserRound,
} from "lucide-react";
import type { Route } from "next";
import Link from "next/link";

import { ActivitiesTab } from "@/components/client-profile/activities-tab";
import { EmptyState, TabPanel } from "@/components/client-profile/tab-shell";
import { RequestErrorAlert } from "@/components/request-error-alert";
import { clientQueries } from "@/lib/api";
import {
  clientName,
  initials,
  money,
  OPPORTUNITY_PRIORITY_META,
  personName,
} from "@/lib/client-presentation";
import { formatDate } from "@/lib/format-date";
import { firstQueryFailure } from "@/lib/query-errors";

import { OPPORTUNITY_TAB_LABELS, OPPORTUNITY_TABS, type OpportunityTab } from "./model";

export function OpportunityProfile({
  opportunityId,
  tab,
}: {
  opportunityId: string;
  tab: OpportunityTab;
}) {
  const opportunityQuery = useQuery(clientQueries.opportunity(opportunityId));
  const activitiesQuery = useQuery({
    ...clientQueries.activities({ clientId: opportunityQuery.data?.opportunity.clientId ?? "" }),
    enabled: tab === "activities" && Boolean(opportunityQuery.data?.opportunity.clientId),
  });
  const transitionsQuery = useQuery({
    ...clientQueries.stageTransitions(opportunityId),
    enabled: tab === "history",
  });
  const loadFailure = firstQueryFailure([
    [opportunityQuery, "Could not load this lead."],
    [activitiesQuery, "Could not load lead activities."],
    [transitionsQuery, "Could not load stage history."],
  ]);
  const row = opportunityQuery.data;

  return (
    <div className="mx-auto w-full max-w-[1240px] space-y-5">
      <Link
        href="/dashboard/clients/pipeline"
        className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Leads &amp; pipeline
      </Link>

      {loadFailure ? (
        <RequestErrorAlert error={loadFailure.error} onRetry={loadFailure.retry} focusOnError />
      ) : null}

      {!row && opportunityQuery.isPending ? (
        <div className="grid min-h-64 place-items-center">
          <LoaderCircle className="animate-spin text-primary" aria-label="Loading lead" />
        </div>
      ) : null}

      {row ? (
        <>
          <section className="overflow-hidden rounded-[16px] bg-card shadow-[var(--shadow-card)] ring-1 ring-border">
            <header className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
              <div className="flex min-w-0 items-start gap-4">
                <span
                  aria-hidden="true"
                  className="grid size-14 shrink-0 place-items-center rounded-[14px] bg-success font-heading text-lg font-bold text-white"
                >
                  {initials(row.opportunity.name)}
                </span>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h1 className="text-strong truncate font-heading text-xl font-bold tracking-[-0.03em]">
                      {row.opportunity.name}
                    </h1>
                    <span className="rounded-md bg-muted px-2.5 py-1 text-[0.6875rem] font-bold text-muted-foreground">
                      {row.pipelineStage.name}
                    </span>
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-info">
                      <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                      Prospect
                    </span>
                  </div>
                  <dl className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Briefcase className="size-3.5" aria-hidden="true" />
                      <dt className="sr-only">Industry</dt>
                      <dd>{row.industry?.name ?? "No industry"}</dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <UserRound className="size-3.5" aria-hidden="true" />
                      <dt className="sr-only">Owner</dt>
                      <dd>{personName(row.owner.person)}</dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="size-3.5" aria-hidden="true" />
                      <dt className="sr-only">Branch</dt>
                      <dd>{row.branch.name}</dd>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CalendarDays className="size-3.5" aria-hidden="true" />
                      <dt>Created</dt>
                      <dd>{formatDate(row.opportunity.createdAt, row.branch.timezone)}</dd>
                    </div>
                  </dl>
                </div>
              </div>
              {row.client ? (
                <Link
                  href={`/dashboard/clients/${row.client.id}?opportunityId=${row.opportunity.id}`}
                  className="text-strong inline-flex h-10 items-center rounded-[11px] border border-border px-4 text-xs font-bold hover:bg-muted"
                >
                  Open {clientName(row.client)}
                </Link>
              ) : null}
            </header>
            <div className="relative border-t border-border">
              <nav aria-label="Lead sections" className="overflow-x-auto px-3">
                <ul className="flex min-w-max">
                  {OPPORTUNITY_TABS.map((item) => (
                    <li key={item}>
                      <Link
                        href={
                          `/dashboard/clients/opportunities/${opportunityId}?tab=${item}` as Route
                        }
                        aria-current={item === tab ? "page" : undefined}
                        className={`inline-flex min-h-11 items-center border-b-2 px-3.5 text-xs font-semibold ${
                          item === tab
                            ? "text-strong border-success"
                            : "border-transparent text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {OPPORTUNITY_TAB_LABELS[item]}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent sm:hidden"
              />
            </div>
          </section>

          {tab === "overview" ? (
            <TabPanel className="p-6">
              <h2 className="text-strong font-heading text-base font-bold">Lead information</h2>
              <dl className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                <Detail label="Stage">{row.pipelineStage.name}</Detail>
                <Detail label="Outcome">{row.pipelineStage.outcome}</Detail>
                <Detail label="Priority">
                  {OPPORTUNITY_PRIORITY_META[row.opportunity.priority].label}
                </Detail>
                <Detail label="Estimated value">
                  {money(row.opportunity.estimatedValue, row.opportunity.currency ?? "ETB")}
                </Detail>
                <Detail label="Account owner">{personName(row.owner.person)}</Detail>
                <Detail label="Last activity">
                  {formatDate(row.opportunity.lastActivityAt, row.branch.timezone)}
                </Detail>
              </dl>
              <p className="mt-6 rounded-[11px] bg-info/8 px-4 py-3 text-xs text-muted-foreground">
                Contacts, projects, invoices, notes, and Client audit data become available after
                this opportunity is linked to a Client record.
              </p>
            </TabPanel>
          ) : null}

          {tab === "activities" ? (
            !row.opportunity.clientId ? (
              <TabPanel>
                <EmptyState
                  icon={<PhoneCall className="size-5" aria-hidden="true" />}
                  title="No activities yet"
                  hint="Link this opportunity to a Client record to start logging calls, meetings, and site visits."
                />
              </TabPanel>
            ) : activitiesQuery.isPending ? (
              <LoadingTab label="activities" />
            ) : (
              <ActivitiesTab
                activities={activitiesQuery.data ?? []}
                timeZone={row.branch.timezone}
                clientId={row.opportunity.clientId}
                branchId={row.branch.id}
                ownerEmployeeId={row.opportunity.ownerEmployeeId}
              />
            )
          ) : null}

          {tab === "history" ? (
            transitionsQuery.isPending ? (
              <LoadingTab label="stage history" />
            ) : (transitionsQuery.data?.length ?? 0) === 0 ? (
              <TabPanel>
                <EmptyState
                  icon={<History className="size-5" aria-hidden="true" />}
                  title="No stage history"
                  hint="Every movement through the editable sales pipeline will appear here."
                />
              </TabPanel>
            ) : (
              <TabPanel className="p-5">
                <ol className="grid gap-3">
                  {transitionsQuery.data?.map(({ transition, toPipelineStage }) => (
                    <li
                      key={transition.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-[11px] bg-[var(--surface-subtle)] px-4 py-3"
                    >
                      <div>
                        <p className="text-strong text-xs font-bold">
                          Moved to {toPipelineStage.name}
                        </p>
                        {transition.note ? (
                          <p className="mt-0.5 text-xs text-muted-foreground">{transition.note}</p>
                        ) : null}
                      </div>
                      <time className="text-xs text-muted-foreground">
                        {formatDate(transition.occurredAt, row.branch.timezone)}
                      </time>
                    </li>
                  ))}
                </ol>
              </TabPanel>
            )
          ) : null}
        </>
      ) : null}
    </div>
  );
}

function Detail({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[0.6875rem] font-bold tracking-[0.06em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-strong mt-1.5 text-sm font-semibold capitalize">{children}</dd>
    </div>
  );
}

function LoadingTab({ label }: { label: string }) {
  return (
    <TabPanel>
      <div className="grid min-h-56 place-items-center">
        <LoaderCircle className="animate-spin text-primary" aria-label={`Loading ${label}`} />
      </div>
    </TabPanel>
  );
}
