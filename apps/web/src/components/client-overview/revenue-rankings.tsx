import type { ReactNode } from "react";

import type { ClientOverview } from "@/lib/api";
import { initials, money } from "@/lib/client-presentation";

import { TabPanel } from "../client-profile/tab-shell";
import { measureNumber } from "./measure";

const INDUSTRY_TONES = ["bg-success", "bg-workflow", "bg-info", "bg-warning", "bg-destructive"];

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
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{money(amount)}</span>
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

function RankingPanel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <TabPanel className="p-5">
      <h2 className="text-strong font-heading text-base font-bold">{title}</h2>
      {children}
    </TabPanel>
  );
}

function EmptyRanking() {
  return <p className="mt-4 text-xs text-muted-foreground">No invoiced revenue yet.</p>;
}

function topAmount(amounts: number[]) {
  return Math.max(1, ...amounts);
}

export function RevenueRankings({
  byIndustry,
  byClient,
  byBranch,
}: Pick<ClientOverview, "byIndustry" | "byClient" | "byBranch">) {
  const industryMax = topAmount(byIndustry.map((row) => measureNumber(row.invoiced)));
  const clientMax = topAmount(byClient.map((row) => measureNumber(row.invoiced)));
  const branchMax = topAmount(byBranch.map((row) => measureNumber(row.invoiced)));

  return (
    <div className="grid items-start gap-5 xl:grid-cols-3">
      <RankingPanel title="Revenue by industry">
        {byIndustry.length > 0 ? (
          <ul className="mt-5 grid gap-3.5">
            {byIndustry.map((row, rowIndex) => (
              <MeasureBar
                key={row.industry.id}
                label={row.industry.name}
                amount={measureNumber(row.invoiced)}
                max={industryMax}
                tone={INDUSTRY_TONES[rowIndex % INDUSTRY_TONES.length]!}
              />
            ))}
          </ul>
        ) : (
          <EmptyRanking />
        )}
      </RankingPanel>

      <RankingPanel title="Top clients">
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
          <EmptyRanking />
        )}
      </RankingPanel>

      <RankingPanel title="Revenue by branch">
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
          <EmptyRanking />
        )}
      </RankingPanel>
    </div>
  );
}
