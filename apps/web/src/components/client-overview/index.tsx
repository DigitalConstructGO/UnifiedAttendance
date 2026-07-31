"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, LoaderCircle, Repeat2, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";

import { RequestErrorAlert } from "@/components/request-error-alert";
import { clientQueries } from "@/lib/api";
import { initials, money } from "@/lib/client-presentation";
import { firstQueryFailure } from "@/lib/query-errors";

import { TabPanel } from "../client-profile/tab-shell";

type Measure = { amount: string | null; currency: string | null };

function measureText(measure: Measure | undefined) {
  if (!measure) return "—";
  if (measure.amount === null) return "Mixed currencies";
  return money(measure.amount, measure.currency ?? "ETB");
}

function measureNumber(measure: Measure | undefined) {
  return measure?.amount === null || measure?.amount === undefined ? 0 : Number(measure.amount);
}

function StatTile({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <TabPanel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <span
          aria-hidden="true"
          className={`grid size-9 place-items-center rounded-[11px] ${tone}`}
        >
          {icon}
        </span>
      </div>
      <p className="text-strong mt-3 font-heading text-3xl font-bold tracking-[-0.03em]">{value}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
    </TabPanel>
  );
}

function MeasureBar({
  label,
  amount,
  max,
  tone,
  leading,
}: {
  label: string;
  amount: number;
  max: number;
  tone: string;
  leading?: ReactNode;
}) {
  const percent = max === 0 ? 0 : Math.round((amount / max) * 100);
  return (
    <li className="grid gap-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-strong flex min-w-0 items-center gap-2 text-xs font-semibold">
          {leading}
          <span className="truncate">{label}</span>
        </span>
        <span className="shrink-0 text-xs text-muted-foreground">{money(amount)}</span>
      </div>
      <div
        className="h-1.5 overflow-hidden rounded-full bg-border"
        role="img"
        aria-label={`${label}: ${percent}% of the highest`}
      >
        <div className={`h-full rounded-full ${tone}`} style={{ width: `${percent}%` }} />
      </div>
    </li>
  );
}

const INDUSTRY_BAR_TONES = ["bg-success", "bg-workflow", "bg-info", "bg-warning", "bg-destructive"];

export function ClientOverview() {
  const overviewQuery = useQuery(clientQueries.overview());
  const loadFailure = firstQueryFailure([[overviewQuery, "Could not load the client dashboard."]]);
  const data = overviewQuery.data;

  if (overviewQuery.isPending) {
    return (
      <div className="grid min-h-64 place-items-center">
        <LoaderCircle className="animate-spin text-primary" aria-label="Loading dashboard" />
      </div>
    );
  }

  if (loadFailure || !data) {
    return (
      <div className="mx-auto w-full max-w-[1400px]">
        {loadFailure ? (
          <RequestErrorAlert error={loadFailure.error} onRetry={loadFailure.retry} focusOnError />
        ) : null}
      </div>
    );
  }

  const { summary, paymentDistribution, byMonth, byIndustry, byClient, byBranch } = data;

  const collected = measureNumber(paymentDistribution.collected);
  const outstanding = measureNumber(paymentDistribution.currentOutstanding);
  const overdue = measureNumber(paymentDistribution.overdue);
  const billed = collected + outstanding + overdue;
  const share = (part: number) => (billed === 0 ? 0 : Math.round((part / billed) * 100));

  const monthMax = Math.max(1, ...byMonth.map((row) => measureNumber(row.invoiced)));
  const industryMax = Math.max(1, ...byIndustry.map((row) => measureNumber(row.invoiced)));
  const clientMax = Math.max(1, ...byClient.map((row) => measureNumber(row.invoiced)));
  const branchMax = Math.max(1, ...byBranch.map((row) => measureNumber(row.invoiced)));

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile
          label="Total clients"
          value={String(summary.totalClientCount)}
          hint={`+${summary.newClientCount} this period`}
          icon={<Building2 className="size-4.5" />}
          tone="bg-workflow/10 text-workflow"
        />
        <StatTile
          label="Active projects"
          value={String(summary.activeProjectCount)}
          hint={`${summary.activeProjectBranchCount} branches`}
          icon={<TrendingUp className="size-4.5" />}
          tone="bg-success/10 text-success"
        />
        <StatTile
          label="Recurring clients"
          value={String(summary.recurringClientCount)}
          hint={`${summary.recurringClientPercent}% of base`}
          icon={<Repeat2 className="size-4.5" />}
          tone="bg-info/10 text-info"
        />
        <StatTile
          label="Lead conversion"
          value={`${summary.opportunityConversion.ratePercent}%`}
          hint={`${summary.opportunityConversion.converted} of ${summary.opportunityConversion.total} opportunities`}
          icon={<TrendingUp className="size-4.5" />}
          tone="bg-warning/12 text-warning"
        />
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.9fr)_minmax(0,1fr)]">
        <TabPanel className="p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-strong font-heading text-base font-bold">Invoiced by month</h2>
            <p className="text-xs text-muted-foreground">
              {data.period.from} → {data.period.to}
            </p>
          </div>
          {byMonth.length > 0 ? (
            <div className="mt-6 flex h-52 items-end gap-3">
              {byMonth.map((row) => {
                const amount = measureNumber(row.invoiced);
                return (
                  <div key={row.period} className="flex min-w-0 flex-1 flex-col items-center gap-2">
                    <span className="text-strong text-[0.6875rem] font-bold">
                      {amount === 0 ? "—" : money(amount, "").trim()}
                    </span>
                    <div
                      className="w-full rounded-t-[7px] bg-success/85"
                      style={{ height: `${Math.max(2, (amount / monthMax) * 100)}%` }}
                      role="img"
                      aria-label={`${row.period}: ${money(amount)}`}
                    />
                    <span className="w-full truncate text-center text-[0.6875rem] text-muted-foreground">
                      {row.period}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">
              No invoices issued in this reporting period.
            </p>
          )}
        </TabPanel>

        <TabPanel className="p-5">
          <h2 className="text-strong font-heading text-base font-bold">Payment status</h2>
          {billed > 0 ? (
            <ul className="mt-5 grid gap-3.5">
              {[
                { label: "Collected", amount: collected, tone: "bg-success" },
                { label: "Outstanding", amount: outstanding, tone: "bg-warning" },
                { label: "Overdue", amount: overdue, tone: "bg-destructive" },
              ].map((slice) => (
                <li key={slice.label} className="grid gap-1.5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-strong flex items-center gap-2 text-xs font-semibold">
                      <span aria-hidden="true" className={`size-2 rounded-full ${slice.tone}`} />
                      {slice.label}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {money(slice.amount)} · {share(slice.amount)}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-border">
                    <div
                      className={`h-full rounded-full ${slice.tone}`}
                      style={{ width: `${share(slice.amount)}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">Nothing has been billed yet.</p>
          )}
        </TabPanel>
      </div>

      <div className="grid items-start gap-5 xl:grid-cols-3">
        <TabPanel className="p-5">
          <h2 className="text-strong font-heading text-base font-bold">Revenue by industry</h2>
          {byIndustry.length > 0 ? (
            <ul className="mt-5 grid gap-3.5">
              {byIndustry.map((row, rowIndex) => (
                <MeasureBar
                  key={row.industry.id}
                  label={row.industry.name}
                  amount={measureNumber(row.invoiced)}
                  max={industryMax}
                  tone={INDUSTRY_BAR_TONES[rowIndex % INDUSTRY_BAR_TONES.length]!}
                />
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">No invoiced revenue yet.</p>
          )}
        </TabPanel>

        <TabPanel className="p-5">
          <h2 className="text-strong font-heading text-base font-bold">Top clients</h2>
          {byClient.length > 0 ? (
            <ul className="mt-5 grid gap-3.5">
              {byClient.slice(0, 5).map((row) => (
                <MeasureBar
                  key={row.client.id}
                  label={row.client.legalName}
                  amount={measureNumber(row.invoiced)}
                  max={clientMax}
                  tone="bg-success"
                  leading={
                    <span
                      aria-hidden="true"
                      className="grid size-6 shrink-0 place-items-center rounded-md bg-workflow/90 text-[0.6875rem] font-bold text-white"
                    >
                      {initials(row.client.legalName)}
                    </span>
                  }
                />
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">No invoiced revenue yet.</p>
          )}
        </TabPanel>

        <TabPanel className="p-5">
          <h2 className="text-strong font-heading text-base font-bold">Revenue by branch</h2>
          {byBranch.length > 0 ? (
            <ul className="mt-5 grid gap-3.5">
              {byBranch.map((row) => (
                <MeasureBar
                  key={row.branch.id}
                  label={row.branch.name}
                  amount={measureNumber(row.invoiced)}
                  max={branchMax}
                  tone="bg-workflow"
                />
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-xs text-muted-foreground">No invoiced revenue yet.</p>
          )}
        </TabPanel>
      </div>

      <p className="text-center text-[0.6875rem] text-muted-foreground">
        Invoiced revenue · {measureText(summary.invoicedRevenue)} · collected{" "}
        {measureText(summary.collectedRevenue)} · outstanding {measureText(summary.outstanding)}
      </p>
    </div>
  );
}
