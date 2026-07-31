"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, LoaderCircle, Repeat2, TrendingUp } from "lucide-react";

import { RequestErrorAlert } from "@/components/request-error-alert";
import { clientQueries } from "@/lib/api";
import { firstQueryFailure } from "@/lib/query-errors";

import { measureText } from "./measure";
import { MonthlyRevenue } from "./monthly-revenue";
import { PaymentStatus } from "./payment-status";
import { RevenueRankings } from "./revenue-rankings";
import { StatTile } from "./stat-tile";

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

  const { summary } = data;

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
        <MonthlyRevenue byMonth={data.byMonth} period={data.period} />
        <PaymentStatus paymentDistribution={data.paymentDistribution} />
      </div>

      <RevenueRankings
        byIndustry={data.byIndustry}
        byClient={data.byClient}
        byBranch={data.byBranch}
      />

      <p className="text-center text-[0.6875rem] text-muted-foreground">
        Invoiced revenue · {measureText(summary.invoicedRevenue)} · collected{" "}
        {measureText(summary.collectedRevenue)} · outstanding {measureText(summary.outstanding)}
      </p>
    </div>
  );
}
