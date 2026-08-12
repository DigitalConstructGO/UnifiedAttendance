import { and, desc, eq, inArray, isNull } from "drizzle-orm";

import {
  clientAuditEntries,
  clientContacts,
  clientOwnerAssignments,
  commercialContracts,
  crmActivities,
  employees,
  invoicePayments,
  invoices,
  opportunities,
  opportunityStageTransitions,
  people,
  pipelineStages,
  projects,
  user,
} from "@UnifiedAttendance/db/schema/index";

import { requirePermission } from "../shared/guards";
import { getClient } from "./clients";
import { minorToMoney, moneyToMinor } from "./money";
import { listProjects } from "./projects";
import { clientOrThrow, currentOrganizationOrThrow, localBusinessDate } from "./shared";

import type { Context } from "../../context";
import type { ClientProjectionInput, ClientResourceIdInput } from "../../validations/clients";

function asDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}

async function invoiceBalances(ctx: Context, clientId: string) {
  const rows = await ctx.db.select().from(invoices).where(eq(invoices.clientId, clientId));
  const payments = await ctx.db
    .select({ invoiceId: invoicePayments.invoiceId, amount: invoicePayments.amount })
    .from(invoicePayments)
    .innerJoin(invoices, eq(invoicePayments.invoiceId, invoices.id))
    .where(eq(invoices.clientId, clientId));
  const paidByInvoice = new Map<string, bigint>();
  for (const payment of payments) {
    paidByInvoice.set(
      payment.invoiceId,
      (paidByInvoice.get(payment.invoiceId) ?? BigInt(0)) + moneyToMinor(payment.amount),
    );
  }
  return rows.map((invoice) => {
    const total = moneyToMinor(invoice.totalAmount);
    const paid = paidByInvoice.get(invoice.id) ?? BigInt(0);
    const outstanding = total > paid ? total - paid : BigInt(0);
    return {
      invoice,
      paidAmount: minorToMoney(paid),
      outstandingAmount: minorToMoney(outstanding),
      outstandingMinor: outstanding,
    };
  });
}

async function clientHealth(ctx: Context, clientId: string, asOf: string) {
  const [latestActivity] = await ctx.db
    .select({ contactDate: crmActivities.contactDate })
    .from(crmActivities)
    .where(eq(crmActivities.clientId, clientId))
    .orderBy(desc(crmActivities.contactDate))
    .limit(1);
  const deliveryRisks = await ctx.db
    .select({ id: projects.id, dueOn: projects.dueOn })
    .from(projects)
    .where(
      and(
        eq(projects.clientId, clientId),
        inArray(projects.status, ["planning", "in_progress"]),
        isNull(projects.archivedAt),
      ),
    );
  const balances = await invoiceBalances(ctx, clientId);
  const reasons: string[] = [];
  let score = 100;
  if (
    balances.some(
      ({ invoice, outstandingMinor }) =>
        invoice.lifecycleStatus === "issued" &&
        outstandingMinor > BigInt(0) &&
        invoice.dueOn !== null &&
        invoice.dueOn < asOf,
    )
  ) {
    score -= 35;
    reasons.push("overdue_invoice");
  }
  if (deliveryRisks.length > 0 && deliveryRisks.some((project) => project.dueOn < asOf)) {
    score -= 25;
    reasons.push("overdue_project");
  }
  if (latestActivity) {
    const staleDays =
      (asDate(asOf).getTime() - latestActivity.contactDate.getTime()) / (24 * 60 * 60 * 1000);
    if (staleDays > 90) {
      score -= 20;
      reasons.push("no_recent_activity");
    }
  } else {
    score -= 15;
    reasons.push("no_activity_recorded");
  }
  score = Math.max(0, score);
  return {
    health: {
      clientId,
      score,
      band: score >= 70 ? "healthy" : score >= 40 ? "watch" : "at_risk",
      reasons,
      calculatedAt: asOf,
    },
    lastActivityAt: latestActivity?.contactDate ?? null,
  };
}

export async function getClientProfile(ctx: Context, input: ClientProjectionInput) {
  const details = await getClient(ctx, { id: input.id });
  const organization = await currentOrganizationOrThrow(ctx);
  const asOf = input.asOf ?? localBusinessDate(organization.timezone);
  const [[primaryContact], currentProjects, activityHealth] = await Promise.all([
    ctx.db
      .select()
      .from(clientContacts)
      .where(
        and(
          eq(clientContacts.clientId, input.id),
          eq(clientContacts.status, "active"),
          eq(clientContacts.isPrimary, true),
        ),
      )
      .limit(1),
    listProjects(ctx, { clientId: input.id }),
    clientHealth(ctx, input.id, asOf),
  ]);
  return {
    ...details,
    primaryContact: primaryContact ?? null,
    currentProjects: currentProjects.filter(
      ({ project }) => project.status === "planning" || project.status === "in_progress",
    ),
    health: activityHealth.health,
    lastActivityAt: activityHealth.lastActivityAt,
  };
}

export async function listClientAuditEntries(ctx: Context, input: ClientResourceIdInput) {
  const client = await clientOrThrow(ctx, input.id);
  await requirePermission(ctx, "clients.read", client.branchId);
  return ctx.db
    .select({ entry: clientAuditEntries, actorUser: user })
    .from(clientAuditEntries)
    .leftJoin(user, eq(clientAuditEntries.actorUserId, user.id))
    .where(eq(clientAuditEntries.clientId, input.id))
    .orderBy(desc(clientAuditEntries.occurredAt));
}

type TimelineItem = {
  sourceType: string;
  sourceId: string;
  kind: string;
  title: string;
  detail: string | null;
  occurredAt: Date;
};

export async function getClientTimeline(ctx: Context, input: ClientProjectionInput) {
  const client = await clientOrThrow(ctx, input.id);
  await requirePermission(ctx, "clients.read", client.branchId);
  const organization = await currentOrganizationOrThrow(ctx);
  const asOf = input.asOf ?? localBusinessDate(organization.timezone);
  const [assignments, transitions, contracts, clientInvoices, payments, activities, balances] =
    await Promise.all([
      ctx.db
        .select({ assignment: clientOwnerAssignments, person: people })
        .from(clientOwnerAssignments)
        .innerJoin(employees, eq(clientOwnerAssignments.ownerEmployeeId, employees.id))
        .innerJoin(people, eq(employees.personId, people.id))
        .where(eq(clientOwnerAssignments.clientId, client.id)),
      ctx.db
        .select({ transition: opportunityStageTransitions, stage: pipelineStages })
        .from(opportunityStageTransitions)
        .innerJoin(opportunities, eq(opportunityStageTransitions.opportunityId, opportunities.id))
        .innerJoin(
          pipelineStages,
          eq(opportunityStageTransitions.toPipelineStageId, pipelineStages.id),
        )
        .where(eq(opportunities.clientId, client.id)),
      ctx.db.select().from(commercialContracts).where(eq(commercialContracts.clientId, client.id)),
      ctx.db.select().from(invoices).where(eq(invoices.clientId, client.id)),
      ctx.db
        .select({ payment: invoicePayments, invoice: invoices })
        .from(invoicePayments)
        .innerJoin(invoices, eq(invoicePayments.invoiceId, invoices.id))
        .where(eq(invoices.clientId, client.id)),
      ctx.db.select().from(crmActivities).where(eq(crmActivities.clientId, client.id)),
      invoiceBalances(ctx, client.id),
    ]);

  const items: TimelineItem[] = [
    {
      sourceType: "client",
      sourceId: client.id,
      kind: "client_created",
      title: "Client created",
      detail: client.clientCode,
      occurredAt: client.createdAt,
    },
    ...assignments.map(({ assignment, person }) => ({
      sourceType: "client_owner_assignment",
      sourceId: assignment.id,
      kind: "account_owner_assigned",
      title: "Account Owner assigned",
      detail: [person.firstName, person.middleName, person.lastName].filter(Boolean).join(" "),
      occurredAt: assignment.effectiveFrom,
    })),
    ...transitions.map(({ transition, stage }) => ({
      sourceType: "opportunity_stage_transition",
      sourceId: transition.id,
      kind: "opportunity_stage_changed",
      title: `Opportunity moved to ${stage.name}`,
      detail: transition.note,
      occurredAt: transition.occurredAt,
    })),
    ...contracts
      .filter((contract) => contract.signedOn)
      .map((contract) => ({
        sourceType: "commercial_contract",
        sourceId: contract.id,
        kind: "commercial_contract_signed",
        title: "Commercial Contract signed",
        detail: contract.contractCode,
        occurredAt: asDate(contract.signedOn!),
      })),
    ...clientInvoices.map((invoice) => ({
      sourceType: "invoice",
      sourceId: invoice.id,
      kind: "invoice_generated",
      title: "Invoice generated",
      detail: `${invoice.invoiceNumber} · ${invoice.totalAmount} ${invoice.currency}`,
      occurredAt: invoice.createdAt,
    })),
    ...payments.map(({ payment, invoice }) => ({
      sourceType: "invoice_payment",
      sourceId: payment.id,
      kind: "invoice_payment_received",
      title: "Invoice Payment received",
      detail: `${payment.amount} ${payment.currency} · ${invoice.invoiceNumber}`,
      occurredAt: asDate(payment.paidOn),
    })),
    ...activities.map((activity) => ({
      sourceType: "crm_activity",
      sourceId: activity.id,
      kind: "crm_activity",
      title: "Contact Activity",
      detail: activity.note,
      occurredAt: activity.contactDate,
    })),
    ...balances
      .filter(
        ({ invoice, outstandingMinor }) =>
          invoice.lifecycleStatus === "issued" &&
          outstandingMinor > BigInt(0) &&
          invoice.dueOn !== null &&
          invoice.dueOn < asOf,
      )
      .map(({ invoice, outstandingAmount }) => ({
        sourceType: "invoice",
        sourceId: invoice.id,
        kind: "payment_overdue",
        title: "Payment overdue",
        detail: `${outstandingAmount} ${invoice.currency} due`,
        occurredAt: asDate(invoice.dueOn!),
      })),
  ];
  return items.sort((left, right) => right.occurredAt.getTime() - left.occurredAt.getTime());
}
