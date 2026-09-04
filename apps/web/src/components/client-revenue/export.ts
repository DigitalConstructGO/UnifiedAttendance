import type { RevenueReport } from "@/lib/api";

import { exportCsv } from "../reports/export-summary";
import { columnLabel, type Grain, type Measure } from "./window";

/**
 * A cell for the spreadsheet, not for the eye: the raw amount, so it stays a
 * number. Mixed-currency totals cannot collapse to one figure, so they carry
 * their breakdown as text instead of a misleading number.
 */
function csvAmount(measure: RevenueReport["periods"][number]["invoiced"]) {
  if (measure.amount !== null) return measure.amount;
  if (measure.breakdown.length === 0) return "0.00";
  return measure.breakdown.map((entry) => `${entry.amount} ${entry.currency}`).join(" + ");
}

export function exportRevenueCsv(
  report: RevenueReport,
  grain: Grain,
  measure: Measure,
  windowLabel: string,
) {
  const header = [
    "Client",
    ...report.periods.map((period) => columnLabel(grain, period)),
    "Total",
    ...(report.previous ? ["Previous total"] : []),
  ];

  const rows = report.clients.map((row) => [
    row.client.legalName,
    ...row.byPeriod.map((period) => csvAmount(period[measure])),
    csvAmount(row.total[measure]),
    ...(report.previous ? [csvAmount(row.previousTotal[measure])] : []),
  ]);

  rows.push([
    "All clients",
    ...report.periods.map((period) => csvAmount(period[measure])),
    csvAmount(report.totals[measure]),
    ...(report.previous ? [csvAmount(report.previous.totals[measure])] : []),
  ]);

  const slug = windowLabel.replaceAll(/[^0-9a-z]+/gi, "-").toLowerCase();
  exportCsv(`revenue-${measure}-${grain}-${slug}.csv`, header, rows);
}
