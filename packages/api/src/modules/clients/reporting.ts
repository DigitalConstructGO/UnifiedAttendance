import { and, eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import {
  branches,
  clients,
  industries,
  invoicePayments,
  invoices,
  opportunities,
  projects,
} from "@UnifiedAttendance/db/schema/index";

import { requirePermission } from "../shared/guards";
import { addCurrencyAmount, moneyMeasure, moneyToMinor } from "./money";
import { currentOrganizationOrThrow, localBusinessDate } from "./shared";

import type { Context } from "../../context";
import type { ClientOverviewInput } from "../../validations/clients";

type CurrencyTotals = Map<string, bigint>;

function inPeriod(value: string, from: string, to: string) {
  return value >= from && value <= to;
}

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function defaultReportingStart(asOf: string) {
  const start = new Date(`${asOf}T00:00:00.000Z`);
  start.setUTCDate(1);
  start.setUTCMonth(start.getUTCMonth() - 5);
  return dateOnly(start);
}

function previousPeriod(from: string, to: string) {
  const start = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  const duration = end.getTime() - start.getTime() + 24 * 60 * 60 * 1000;
  const previousTo = new Date(start.getTime() - 24 * 60 * 60 * 1000);
  const previousFrom = new Date(previousTo.getTime() - duration + 24 * 60 * 60 * 1000);
  return { from: dateOnly(previousFrom), to: dateOnly(previousTo) };
}

function addGroupedAmount(
  groups: Map<string, CurrencyTotals>,
  key: string,
  currency: string,
  amount: string,
) {
  const totals = groups.get(key) ?? new Map<string, bigint>();
  addCurrencyAmount(totals, currency, amount);
  groups.set(key, totals);
}

function rankingValue(totals: CurrencyTotals) {
  if (totals.size !== 1) return null;
  return totals.values().next().value ?? BigInt(0);
}

function averageMeasure(totals: Map<string, { amount: bigint; count: number }>) {
  return moneyMeasure(
    new Map(
      [...totals].map(([currency, value]) => [
        currency,
        value.count === 0 ? BigInt(0) : value.amount / BigInt(value.count),
      ]),
    ),
  );
}

export async function getClientOverview(ctx: Context, input: ClientOverviewInput) {
  await requirePermission(ctx, "clients:read", input.branchId);
  const organization = await currentOrganizationOrThrow();
  const asOf = input.asOf ?? localBusinessDate(organization.timezone);
  const from = input.from ?? defaultReportingStart(asOf);
  const to = input.to ?? asOf;
  const prior = previousPeriod(from, to);
  const branchFilter = input.branchId;
  const revenueMeasure = input.revenueMeasure ?? "invoiced";

  const [clientRows, projectRows, opportunityRows, invoiceRows, paymentRows] = await Promise.all([
    db
      .select({ id: clients.id, status: clients.status, createdAt: clients.createdAt })
      .from(clients)
      .where(
        and(
          eq(clients.organizationId, organization.id),
          ...(branchFilter ? [eq(clients.branchId, branchFilter)] : []),
        ),
      ),
    db
      .select({
        clientId: projects.clientId,
        branchId: projects.branchId,
        status: projects.status,
      })
      .from(projects)
      .where(
        and(
          eq(projects.organizationId, organization.id),
          ...(branchFilter ? [eq(projects.branchId, branchFilter)] : []),
        ),
      ),
    db
      .select({ opportunity: opportunities })
      .from(opportunities)
      .where(
        and(
          eq(opportunities.organizationId, organization.id),
          ...(branchFilter ? [eq(opportunities.branchId, branchFilter)] : []),
        ),
      ),
    db
      .select({
        invoice: invoices,
        client: {
          id: clients.id,
          legalName: clients.legalName,
        },
        industry: {
          id: industries.id,
          name: industries.name,
        },
        branch: {
          id: branches.id,
          name: branches.name,
        },
      })
      .from(invoices)
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .innerJoin(industries, eq(clients.industryId, industries.id))
      .innerJoin(branches, eq(invoices.branchId, branches.id))
      .where(
        and(
          eq(invoices.organizationId, organization.id),
          ...(branchFilter ? [eq(invoices.branchId, branchFilter)] : []),
        ),
      ),
    db
      .select({
        payment: invoicePayments,
        invoice: {
          id: invoices.id,
          clientId: invoices.clientId,
          lifecycleStatus: invoices.lifecycleStatus,
        },
        client: {
          id: clients.id,
          legalName: clients.legalName,
        },
        industry: {
          id: industries.id,
          name: industries.name,
        },
        branch: {
          id: branches.id,
          name: branches.name,
        },
      })
      .from(invoicePayments)
      .innerJoin(invoices, eq(invoicePayments.invoiceId, invoices.id))
      .innerJoin(clients, eq(invoices.clientId, clients.id))
      .innerJoin(industries, eq(clients.industryId, industries.id))
      .innerJoin(branches, eq(invoices.branchId, branches.id))
      .where(
        and(
          eq(invoicePayments.organizationId, organization.id),
          ...(branchFilter ? [eq(invoices.branchId, branchFilter)] : []),
        ),
      ),
  ]);

  const currencyMatches = (currency: string) =>
    input.currency === undefined || currency === input.currency;
  const activeClientCount = clientRows.filter((client) => client.status === "active").length;
  const newClientCount = clientRows.filter((client) =>
    inPeriod(client.createdAt.toISOString().slice(0, 10), from, to),
  ).length;
  const previousNewClientCount = clientRows.filter((client) =>
    inPeriod(client.createdAt.toISOString().slice(0, 10), prior.from, prior.to),
  ).length;
  const activeProjectCount = projectRows.filter(
    (project) => project.status === "planning" || project.status === "in_progress",
  ).length;
  const activeProjectBranchCount = new Set(
    projectRows
      .filter((project) => project.status === "planning" || project.status === "in_progress")
      .map((project) => project.branchId),
  ).size;
  const recurringProjectCounts = new Map<string, number>();
  for (const project of projectRows) {
    if (project.status !== "in_progress" && project.status !== "completed") continue;
    recurringProjectCounts.set(
      project.clientId,
      (recurringProjectCounts.get(project.clientId) ?? 0) + 1,
    );
  }
  const recurringClientCount = [...recurringProjectCounts.values()].filter(
    (projectCount) => projectCount >= 2,
  ).length;

  const reportingOpportunities = opportunityRows.filter(
    ({ opportunity }) => opportunity.currency === null || currencyMatches(opportunity.currency),
  );
  const convertedOpportunities = reportingOpportunities.filter(
    ({ opportunity }) => opportunity.convertedAt !== null,
  );
  const opportunityAverages = new Map<string, { amount: bigint; count: number }>();
  for (const { opportunity } of convertedOpportunities) {
    if (!opportunity.estimatedValue || !opportunity.currency) continue;
    const current = opportunityAverages.get(opportunity.currency) ?? {
      amount: BigInt(0),
      count: 0,
    };
    current.amount += moneyToMinor(opportunity.estimatedValue);
    current.count += 1;
    opportunityAverages.set(opportunity.currency, current);
  }

  const issuedAsOf = invoiceRows.filter(
    ({ invoice }) =>
      invoice.lifecycleStatus === "issued" &&
      invoice.issuedOn !== null &&
      invoice.issuedOn <= asOf &&
      currencyMatches(invoice.currency),
  );
  const reportingInvoices = issuedAsOf.filter(({ invoice }) =>
    inPeriod(invoice.issuedOn!, from, to),
  );
  const paymentsAsOf = paymentRows.filter(
    ({ payment, invoice }) =>
      invoice.lifecycleStatus === "issued" &&
      payment.paidOn <= asOf &&
      currencyMatches(payment.currency),
  );
  const reportingPayments = paymentsAsOf.filter(({ payment }) =>
    inPeriod(payment.paidOn, from, to),
  );

  const invoiced = new Map<string, bigint>();
  const collected = new Map<string, bigint>();
  const previousInvoiced = new Map<string, bigint>();
  const previousCollected = new Map<string, bigint>();
  const paidByInvoice = new Map<string, bigint>();
  for (const { invoice } of reportingInvoices) {
    addCurrencyAmount(invoiced, invoice.currency, invoice.totalAmount);
  }
  for (const { payment } of reportingPayments) {
    addCurrencyAmount(collected, payment.currency, payment.amount);
  }
  for (const { invoice } of issuedAsOf) {
    if (inPeriod(invoice.issuedOn!, prior.from, prior.to)) {
      addCurrencyAmount(previousInvoiced, invoice.currency, invoice.totalAmount);
    }
  }
  for (const { payment } of paymentsAsOf) {
    if (inPeriod(payment.paidOn, prior.from, prior.to)) {
      addCurrencyAmount(previousCollected, payment.currency, payment.amount);
    }
  }
  for (const { payment } of paymentsAsOf) {
    paidByInvoice.set(
      payment.invoiceId,
      (paidByInvoice.get(payment.invoiceId) ?? BigInt(0)) + moneyToMinor(payment.amount),
    );
  }

  const outstanding = new Map<string, bigint>();
  const overdue = new Map<string, bigint>();
  const currentOutstanding = new Map<string, bigint>();
  const allCollected = new Map<string, bigint>();
  let overdueInvoiceCount = 0;
  for (const { invoice } of issuedAsOf) {
    const total = moneyToMinor(invoice.totalAmount);
    const paid = paidByInvoice.get(invoice.id) ?? BigInt(0);
    const balance = total > paid ? total - paid : BigInt(0);
    outstanding.set(invoice.currency, (outstanding.get(invoice.currency) ?? BigInt(0)) + balance);
    allCollected.set(invoice.currency, (allCollected.get(invoice.currency) ?? BigInt(0)) + paid);
    if (balance === BigInt(0)) continue;
    if (invoice.dueOn !== null && invoice.dueOn < asOf) {
      overdue.set(invoice.currency, (overdue.get(invoice.currency) ?? BigInt(0)) + balance);
      overdueInvoiceCount += 1;
    } else {
      currentOutstanding.set(
        invoice.currency,
        (currentOutstanding.get(invoice.currency) ?? BigInt(0)) + balance,
      );
    }
  }

  const monthly = new Map<string, { invoiced: CurrencyTotals; collected: CurrencyTotals }>();
  for (const { invoice } of reportingInvoices) {
    const period = invoice.issuedOn!.slice(0, 7);
    const values = monthly.get(period) ?? {
      invoiced: new Map(),
      collected: new Map(),
    };
    addCurrencyAmount(values.invoiced, invoice.currency, invoice.totalAmount);
    monthly.set(period, values);
  }
  for (const { payment } of reportingPayments) {
    const period = payment.paidOn.slice(0, 7);
    const values = monthly.get(period) ?? {
      invoiced: new Map(),
      collected: new Map(),
    };
    addCurrencyAmount(values.collected, payment.currency, payment.amount);
    monthly.set(period, values);
  }

  const byIndustry = new Map<string, CurrencyTotals>();
  const byClient = new Map<string, CurrencyTotals>();
  const byBranch = new Map<string, CurrencyTotals>();
  const collectedByIndustry = new Map<string, CurrencyTotals>();
  const collectedByClient = new Map<string, CurrencyTotals>();
  const collectedByBranch = new Map<string, CurrencyTotals>();
  const industryLabels = new Map<string, { id: string; name: string }>();
  const clientLabels = new Map<string, { id: string; legalName: string }>();
  const branchLabels = new Map<string, { id: string; name: string }>();
  for (const row of reportingInvoices) {
    const { invoice, industry, client, branch } = row;
    addGroupedAmount(byIndustry, industry.id, invoice.currency, invoice.totalAmount);
    addGroupedAmount(byClient, client.id, invoice.currency, invoice.totalAmount);
    addGroupedAmount(byBranch, branch.id, invoice.currency, invoice.totalAmount);
    industryLabels.set(industry.id, industry);
    clientLabels.set(client.id, client);
    branchLabels.set(branch.id, branch);
  }
  for (const row of reportingPayments) {
    const { payment, industry, client, branch } = row;
    addGroupedAmount(collectedByIndustry, industry.id, payment.currency, payment.amount);
    addGroupedAmount(collectedByClient, client.id, payment.currency, payment.amount);
    addGroupedAmount(collectedByBranch, branch.id, payment.currency, payment.amount);
    industryLabels.set(industry.id, industry);
    clientLabels.set(client.id, client);
    branchLabels.set(branch.id, branch);
  }
  const shapeGroups = <T>(
    invoicedGroups: Map<string, CurrencyTotals>,
    collectedGroups: Map<string, CurrencyTotals>,
    labels: Map<string, T>,
    labelKey: string,
  ) =>
    [...new Set([...invoicedGroups.keys(), ...collectedGroups.keys()])]
      .sort((leftId, rightId) => {
        const left =
          revenueMeasure === "invoiced"
            ? (invoicedGroups.get(leftId) ?? new Map())
            : (collectedGroups.get(leftId) ?? new Map());
        const right =
          revenueMeasure === "invoiced"
            ? (invoicedGroups.get(rightId) ?? new Map())
            : (collectedGroups.get(rightId) ?? new Map());
        const leftRank = rankingValue(left);
        const rightRank = rankingValue(right);
        if (leftRank === null || rightRank === null) return leftId.localeCompare(rightId);
        const difference = rightRank - leftRank;
        return difference > BigInt(0) ? 1 : difference < BigInt(0) ? -1 : 0;
      })
      .map((id) => ({
        [labelKey]: labels.get(id)!,
        invoiced: moneyMeasure(invoicedGroups.get(id) ?? new Map()),
        collected: moneyMeasure(collectedGroups.get(id) ?? new Map()),
      }));

  return {
    period: {
      asOf,
      from,
      to,
      previousFrom: prior.from,
      previousTo: prior.to,
      branchId: branchFilter ?? null,
      currency: input.currency ?? null,
      revenueMeasure,
    },
    summary: {
      totalClientCount: clientRows.length,
      activeClientCount,
      newClientCount,
      activeProjectCount,
      activeProjectBranchCount,
      recurringClientCount,
      recurringClientPercent:
        clientRows.length === 0
          ? 0
          : Number(((recurringClientCount / clientRows.length) * 100).toFixed(2)),
      invoicedRevenue: moneyMeasure(invoiced),
      collectedRevenue: moneyMeasure(collected),
      outstanding: moneyMeasure(outstanding),
      overdue: { ...moneyMeasure(overdue), invoiceCount: overdueInvoiceCount },
      averageOpportunityValue: averageMeasure(opportunityAverages),
      opportunityConversion: {
        total: reportingOpportunities.length,
        converted: convertedOpportunities.length,
        ratePercent:
          reportingOpportunities.length === 0
            ? 0
            : Number(
                ((convertedOpportunities.length / reportingOpportunities.length) * 100).toFixed(2),
              ),
      },
    },
    previousPeriod: {
      newClientCount: previousNewClientCount,
      invoicedRevenue: moneyMeasure(previousInvoiced),
      collectedRevenue: moneyMeasure(previousCollected),
    },
    paymentDistribution: {
      collected: moneyMeasure(allCollected),
      currentOutstanding: moneyMeasure(currentOutstanding),
      overdue: moneyMeasure(overdue),
    },
    byMonth: [...monthly]
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([period, values]) => ({
        period,
        invoiced: moneyMeasure(values.invoiced),
        collected: moneyMeasure(values.collected),
      })),
    byIndustry: shapeGroups(byIndustry, collectedByIndustry, industryLabels, "industry") as Array<{
      industry: { id: string; name: string };
      invoiced: ReturnType<typeof moneyMeasure>;
      collected: ReturnType<typeof moneyMeasure>;
    }>,
    byClient: shapeGroups(byClient, collectedByClient, clientLabels, "client") as Array<{
      client: { id: string; legalName: string };
      invoiced: ReturnType<typeof moneyMeasure>;
      collected: ReturnType<typeof moneyMeasure>;
    }>,
    byBranch: shapeGroups(byBranch, collectedByBranch, branchLabels, "branch") as Array<{
      branch: { id: string; name: string };
      invoiced: ReturnType<typeof moneyMeasure>;
      collected: ReturnType<typeof moneyMeasure>;
    }>,
  };
}
