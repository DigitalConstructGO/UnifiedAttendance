import { and, eq, isNull } from "drizzle-orm";

import { clients, invoicePayments, invoices } from "@UnifiedAttendance/db/schema/index";

import { mondayFirstWeekday } from "../../attendance/day-context";
import { addDays } from "../shared/zoned-time";
import { requirePermission } from "../shared/guards";
import { addCurrencyAmount, moneyMeasure } from "./money";
import { currentOrganizationOrThrow, localBusinessDate } from "./shared";

import type { Context } from "../../context";
import type { RevenueReportInput } from "../../validations/clients";

type Grain = "week" | "month" | "year";
type CurrencyTotals = Map<string, bigint>;
type Measures = { invoiced: CurrencyTotals; collected: CurrencyTotals };

/**
 * Dates arrive as plain `YYYY-MM-DD` text, so bucketing is string work rather
 * than SQL date functions — which also keeps this off `date_trunc`, a
 * Postgres-ism SQLite does not have.
 */
function bucketFor(date: string, grain: Grain) {
  if (grain === "year") return date.slice(0, 4);
  if (grain === "month") return date.slice(0, 7);
  return addDays(date, -mondayFirstWeekday(date));
}

function bucketStart(bucket: string, grain: Grain) {
  if (grain === "year") return `${bucket}-01-01`;
  if (grain === "month") return `${bucket}-01`;
  return bucket;
}

/** The inclusive last day covered by a bucket. */
function bucketEnd(bucket: string, grain: Grain) {
  if (grain === "year") return `${bucket}-12-31`;
  if (grain === "week") return addDays(bucket, 6);
  const [year, month] = bucket.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year!, month!, 0)).getUTCDate();
  return `${bucket}-${String(lastDay).padStart(2, "0")}`;
}

function nextBucket(bucket: string, grain: Grain) {
  return bucketFor(addDays(bucketEnd(bucket, grain), 1), grain);
}

/** How far back the default window reaches, per grain. */
const DEFAULT_SPAN: Record<Grain, number> = { week: 12 * 7, month: 365, year: 365 * 5 };

function inPeriod(value: string, from: string, to: string) {
  return value >= from && value <= to;
}

function emptyMeasures(): Measures {
  return { invoiced: new Map(), collected: new Map() };
}

/**
 * Every bucket the window covers, including ones with no money in them — a gap
 * in a revenue column means zero, and the grid has to render that column.
 */
function periodsBetween(from: string, to: string, grain: Grain) {
  const periods: string[] = [];
  let cursor = bucketFor(from, grain);
  const last = bucketFor(to, grain);
  // Guard against a pathological window rather than looping forever.
  while (cursor <= last && periods.length < 600) {
    periods.push(cursor);
    cursor = nextBucket(cursor, grain);
  }
  return periods;
}

function rankOf(totals: CurrencyTotals) {
  // No currencies means the client earned nothing on this measure — a real
  // zero, not an unrankable value. Only a total spanning several currencies
  // cannot be reduced to one comparable figure.
  if (totals.size === 0) return BigInt(0);
  if (totals.size > 1) return null;
  return totals.values().next().value ?? BigInt(0);
}

export async function getRevenueReport(ctx: Context, input: RevenueReportInput) {
  await requirePermission(ctx, "clients.read", input.branchId);
  const organization = await currentOrganizationOrThrow(ctx);

  const grain = input.grain ?? "month";
  const revenueMeasure = input.revenueMeasure ?? "invoiced";
  const asOf = input.asOf ?? localBusinessDate(organization.timezone);
  const from =
    input.from ?? bucketStart(bucketFor(addDays(asOf, -DEFAULT_SPAN[grain]), grain), grain);
  const to = input.to ?? asOf;
  const branchFilter = input.branchId;
  const { compareFrom, compareTo } = input;

  const [invoiceRows, paymentRows] = await Promise.all([
    ctx.db
      .select({
        clientId: invoices.clientId,
        legalName: clients.legalName,
        issuedOn: invoices.issuedOn,
        currency: invoices.currency,
        totalAmount: invoices.totalAmount,
      })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(
        and(
          eq(invoices.organizationId, organization.id),
          // Only issued invoices are revenue: a draft was never billed and has
          // no `issuedOn` to bucket by, and a void one has been cancelled. This
          // matches the client dashboard and the directory rows.
          eq(invoices.lifecycleStatus, "issued"),
          ...(branchFilter ? [eq(invoices.branchId, branchFilter)] : []),
        ),
      ),
    ctx.db
      .select({
        clientId: invoices.clientId,
        legalName: clients.legalName,
        paidOn: invoicePayments.paidOn,
        currency: invoicePayments.currency,
        amount: invoicePayments.amount,
      })
      .from(invoicePayments)
      .innerJoin(invoices, eq(invoicePayments.invoiceId, invoices.id))
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .where(
        and(
          eq(invoicePayments.organizationId, organization.id),
          isNull(invoicePayments.archivedAt),
          ...(branchFilter ? [eq(invoices.branchId, branchFilter)] : []),
        ),
      ),
  ]);

  const periods = periodsBetween(from, to, grain);
  const names = new Map<string, string>();
  /** clientId → period → measures */
  const grid = new Map<string, Map<string, Measures>>();
  const clientTotals = new Map<string, Measures>();
  const periodTotals = new Map<string, Measures>();
  const grandTotal = emptyMeasures();
  // The window this one is measured against. The caller supplies it, because
  // only the caller knows the window's calendar shape — shifting by raw day
  // count would compare February against a ragged slice of January.
  const compareTotals = new Map<string, Measures>();
  const compareGrand = emptyMeasures();

  function cellFor(clientId: string, period: string) {
    const row = grid.get(clientId) ?? new Map<string, Measures>();
    grid.set(clientId, row);
    const cell = row.get(period) ?? emptyMeasures();
    row.set(period, cell);
    return cell;
  }

  function totalFor(store: Map<string, Measures>, key: string) {
    const existing = store.get(key) ?? emptyMeasures();
    store.set(key, existing);
    return existing;
  }

  function record(
    kind: "invoiced" | "collected",
    clientId: string,
    legalName: string,
    date: string,
    currency: string,
    amount: string,
  ) {
    if (compareFrom && compareTo && inPeriod(date, compareFrom, compareTo)) {
      // A client that earned only in the comparison window still needs a name,
      // so it can be shown as a drop to zero rather than vanishing.
      names.set(clientId, legalName);
      addCurrencyAmount(totalFor(compareTotals, clientId)[kind], currency, amount);
      addCurrencyAmount(compareGrand[kind], currency, amount);
    }
    if (!inPeriod(date, from, to)) return;
    const period = bucketFor(date, grain);
    names.set(clientId, legalName);
    addCurrencyAmount(cellFor(clientId, period)[kind], currency, amount);
    addCurrencyAmount(totalFor(clientTotals, clientId)[kind], currency, amount);
    addCurrencyAmount(totalFor(periodTotals, period)[kind], currency, amount);
    addCurrencyAmount(grandTotal[kind], currency, amount);
  }

  for (const invoice of invoiceRows) {
    if (!invoice.issuedOn) continue;
    record(
      "invoiced",
      invoice.clientId,
      invoice.legalName,
      invoice.issuedOn,
      invoice.currency,
      invoice.totalAmount,
    );
  }
  for (const payment of paymentRows) {
    record(
      "collected",
      payment.clientId,
      payment.legalName,
      payment.paidOn,
      payment.currency,
      payment.amount,
    );
  }

  const shapeMeasures = (measures: Measures) => ({
    invoiced: moneyMeasure(measures.invoiced),
    collected: moneyMeasure(measures.collected),
  });

  // Biggest earner first, on whichever measure the caller asked for. Clients
  // whose totals span several currencies cannot be ranked against a single
  // figure, so they fall back to alphabetical.
  const rows = [...names.keys()]
    .sort((left, right) => {
      const leftRank = rankOf(totalFor(clientTotals, left)[revenueMeasure]);
      const rightRank = rankOf(totalFor(clientTotals, right)[revenueMeasure]);
      if (leftRank === null || rightRank === null || leftRank === rightRank) {
        return names.get(left)!.localeCompare(names.get(right)!);
      }
      return rightRank > leftRank ? 1 : -1;
    })
    .map((clientId) => ({
      client: { id: clientId, legalName: names.get(clientId)! },
      byPeriod: periods.map((period) => ({
        period,
        ...shapeMeasures(grid.get(clientId)?.get(period) ?? emptyMeasures()),
      })),
      total: shapeMeasures(totalFor(clientTotals, clientId)),
      previousTotal: shapeMeasures(totalFor(compareTotals, clientId)),
    }));

  return {
    grain,
    // Which measure the UI shows by default. Both are returned everywhere, so
    // toggling between them needs no refetch.
    revenueMeasure,
    from,
    to,
    asOf,
    branchId: branchFilter ?? null,
    periods: periods.map((period) => ({
      period,
      start: bucketStart(period, grain),
      end: bucketEnd(period, grain),
      ...shapeMeasures(totalFor(periodTotals, period)),
    })),
    clients: rows,
    totals: shapeMeasures(grandTotal),
    previous:
      compareFrom && compareTo
        ? { from: compareFrom, to: compareTo, totals: shapeMeasures(compareGrand) }
        : null,
  };
}
