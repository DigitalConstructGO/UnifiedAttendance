"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  Download,
  LoaderCircle,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { RequestErrorAlert } from "@/components/request-error-alert";
import { Button } from "@/components/ui/button";
import { clientKeys, clientsApi, type RevenueReport } from "@/lib/api";
import { presentRequestError } from "@/lib/errors";

import { measureText } from "../client-overview/measure";
import { EmptyState, TabPanel } from "../client-profile/tab-shell";
import { deltaBetween, deltaText } from "./delta";
import { exportRevenueCsv } from "./export";
import { RevenueChart } from "./revenue-chart";
import {
  columnLabel,
  shiftAnchor,
  windowFor,
  windowLabel,
  type Grain,
  type Measure,
} from "./window";

const GRAINS: { value: Grain; label: string }[] = [
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
  { value: "year", label: "Yearly" },
];

const MEASURES: { value: Measure; label: string; hint: string }[] = [
  { value: "invoiced", label: "Invoiced", hint: "Billed on the invoice issue date" },
  { value: "collected", label: "Collected", hint: "Received on the payment date" },
];

function SegmentedControl<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string; hint?: string }[];
  value: T;
  onChange: (next: T) => void;
}) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex rounded-lg bg-(--surface-subtle) p-1"
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          aria-pressed={value === option.value}
          title={option.hint}
          onClick={() => onChange(option.value)}
          className={`min-h-9 rounded-[8px] px-3.5 text-xs font-bold transition-colors ${
            value === option.value
              ? "text-strong bg-card shadow-(--shadow-card)"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

/** A cell shows an em dash rather than a hard zero when nothing happened. */
function cellText(measure: RevenueReport["periods"][number]["invoiced"]) {
  if (measure.breakdown.length === 0) return "—";
  return measureText(measure);
}

/**
 * Direction is carried by an arrow and a sign as well as colour, so the trend
 * is never colour-alone.
 */
function DeltaBadge({
  current,
  previous,
}: {
  current: RevenueReport["totals"]["invoiced"];
  previous: RevenueReport["totals"]["invoiced"];
}) {
  const delta = deltaBetween(current, previous);
  const tone =
    delta.direction === "up"
      ? "text-success"
      : delta.direction === "down"
        ? "text-destructive"
        : "text-muted-foreground";

  return (
    <span className={`inline-flex items-center gap-1 font-bold tabular-nums ${tone}`}>
      {delta.direction === "up" ? (
        <TrendingUp className="size-3.5" aria-hidden="true" />
      ) : delta.direction === "down" ? (
        <TrendingDown className="size-3.5" aria-hidden="true" />
      ) : null}
      {deltaText(delta)}
    </span>
  );
}

function HeadlineDelta({ report, measure }: { report: RevenueReport; measure: Measure }) {
  if (!report.previous) return null;
  return (
    <span className="inline-flex items-center gap-1.5">
      <DeltaBadge current={report.totals[measure]} previous={report.previous.totals[measure]} />
      <span>vs {measureText(report.previous.totals[measure])} previously</span>
    </span>
  );
}

export function ClientRevenue() {
  const today = new Date().toISOString().slice(0, 10);
  const [grain, setGrain] = useState<Grain>("month");
  const [measure, setMeasure] = useState<Measure>("invoiced");
  const [anchor, setAnchor] = useState(today);

  const range = windowFor(grain, anchor);
  // The equivalent window immediately before this one. Computed here rather
  // than on the server because only the navigator knows the window's calendar
  // shape — a raw day-count shift would compare February against part of January.
  const previousRange = windowFor(grain, shiftAnchor(grain, anchor, -1));
  const params = {
    grain,
    ...range,
    compareFrom: previousRange.from,
    compareTo: previousRange.to,
  };
  const query = useQuery({
    queryKey: clientKeys.revenue(params),
    queryFn: ({ signal }) => clientsApi.revenue(params, signal),
  });

  const report = query.data;

  return (
    <div className="mx-auto w-full max-w-350 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Previous period"
            onClick={() => setAnchor(shiftAnchor(grain, anchor, -1))}
          >
            <ChevronLeft aria-hidden="true" />
          </Button>
          <p
            aria-live="polite"
            className="text-strong min-w-32 text-center text-sm font-bold tabular-nums"
          >
            {windowLabel(grain, range)}
          </p>
          <Button
            type="button"
            variant="outline"
            size="icon"
            aria-label="Next period"
            onClick={() => setAnchor(shiftAnchor(grain, anchor, 1))}
          >
            <ChevronRight aria-hidden="true" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            className="text-xs font-bold"
            onClick={() => setAnchor(today)}
          >
            Today
          </Button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <SegmentedControl
            label="Period grouping"
            options={GRAINS}
            value={grain}
            onChange={(next) => setGrain(next)}
          />
          <SegmentedControl
            label="Revenue measure"
            options={MEASURES}
            value={measure}
            onChange={(next) => setMeasure(next)}
          />
          <Button
            type="button"
            variant="outline"
            className="h-10 text-xs font-bold"
            disabled={!report || report.clients.length === 0}
            onClick={() =>
              report && exportRevenueCsv(report, grain, measure, windowLabel(grain, range))
            }
          >
            <Download aria-hidden="true" />
            Export CSV
          </Button>
        </div>
      </div>

      {query.isError ? (
        <RequestErrorAlert
          error={presentRequestError(query.error, "Could not load the revenue report.")}
          onRetry={() => query.refetch()}
        />
      ) : null}

      {query.isPending ? (
        <div className="grid min-h-64 place-items-center">
          <LoaderCircle className="animate-spin text-primary" aria-label="Loading revenue" />
        </div>
      ) : null}

      {report ? (
        <>
          <TabPanel className="px-5 py-4">
            <p className="text-[0.6875rem] font-bold tracking-[0.06em] text-muted-foreground uppercase">
              {measure === "invoiced" ? "Invoiced" : "Collected"} · {windowLabel(grain, range)}
            </p>
            <p className="text-strong mt-1 text-2xl font-bold tabular-nums">
              {measureText(report.totals[measure])}
            </p>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>
                across {report.clients.length} {report.clients.length === 1 ? "client" : "clients"}
              </span>
              {report.previous ? <HeadlineDelta report={report} measure={measure} /> : null}
            </div>
          </TabPanel>

          <RevenueChart periods={report.periods} grain={grain} label={windowLabel(grain, range)} />

          {report.clients.length === 0 ? (
            <TabPanel>
              <EmptyState
                icon={<TrendingUp className="size-5" aria-hidden="true" />}
                title={measure === "invoiced" ? "Nothing invoiced yet" : "Nothing collected yet"}
                hint={
                  measure === "invoiced"
                    ? "Issued invoices are counted in the period they were issued in. Drafts are never counted."
                    : "Payments are counted on the date they were received."
                }
              />
            </TabPanel>
          ) : (
            <TabPanel className="overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left text-xs">
                  <caption className="sr-only">
                    {measure === "invoiced" ? "Amount invoiced" : "Amount collected"} per client, by{" "}
                    {grain}, for {windowLabel(grain, range)}
                  </caption>
                  <thead className="bg-(--surface-subtle) text-[0.6875rem] font-bold tracking-[0.06em] text-muted-foreground uppercase">
                    <tr>
                      <th
                        scope="col"
                        className="sticky left-0 z-10 bg-(--surface-subtle) px-5 py-3.5"
                      >
                        Client
                      </th>
                      {report.periods.map((period) => (
                        <th
                          key={period.period}
                          scope="col"
                          className="px-4 py-3.5 text-right whitespace-nowrap"
                        >
                          {columnLabel(grain, period)}
                        </th>
                      ))}
                      <th scope="col" className="px-5 py-3.5 text-right">
                        Total
                      </th>
                      {report.previous ? (
                        <th scope="col" className="px-4 py-3.5 text-right whitespace-nowrap">
                          vs previous
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {report.clients.map((row) => (
                      <tr key={row.client.id} className="border-t border-border">
                        <th
                          scope="row"
                          className="sticky left-0 z-10 bg-card px-5 py-4 text-left font-bold"
                        >
                          <Link
                            href={`/dashboard/clients/${row.client.id}`}
                            className="text-strong hover:text-primary hover:underline"
                          >
                            {row.client.legalName}
                          </Link>
                        </th>
                        {row.byPeriod.map((period) => (
                          <td
                            key={period.period}
                            className="px-4 py-4 text-right whitespace-nowrap text-muted-foreground tabular-nums"
                          >
                            {cellText(period[measure])}
                          </td>
                        ))}
                        <td className="text-strong px-5 py-4 text-right font-bold whitespace-nowrap tabular-nums">
                          {measureText(row.total[measure])}
                        </td>
                        {report.previous ? (
                          <td className="px-4 py-4 text-right whitespace-nowrap">
                            <DeltaBadge
                              current={row.total[measure]}
                              previous={row.previousTotal[measure]}
                            />
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t-2 border-border bg-(--surface-subtle)">
                    <tr>
                      <th
                        scope="row"
                        className="text-strong sticky left-0 z-10 bg-(--surface-subtle) px-5 py-4 text-left font-bold"
                      >
                        All clients
                      </th>
                      {report.periods.map((period) => (
                        <td
                          key={period.period}
                          className="text-strong px-4 py-4 text-right font-bold whitespace-nowrap tabular-nums"
                        >
                          {cellText(period[measure])}
                        </td>
                      ))}
                      <td className="text-strong px-5 py-4 text-right font-bold whitespace-nowrap tabular-nums">
                        {measureText(report.totals[measure])}
                      </td>
                      {report.previous ? (
                        <td className="px-4 py-4 text-right whitespace-nowrap">
                          <DeltaBadge
                            current={report.totals[measure]}
                            previous={report.previous.totals[measure]}
                          />
                        </td>
                      ) : null}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </TabPanel>
          )}
        </>
      ) : null}
    </div>
  );
}
