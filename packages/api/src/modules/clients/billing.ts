import { and, asc, count, eq, like } from "drizzle-orm";

import {
  branches,
  clientAuditEntries,
  clientDocuments,
  clients,
  commercialContracts,
  employees,
  invoicePayments,
  invoices,
  projects,
} from "@UnifiedAttendance/db/schema/index";

import { badRequest, conflict, notFound } from "../../errors";
import { withTransaction } from "../../context";
import { requirePermission, requireSessionUser } from "../shared/guards";
import { minorToMoney, moneyToMinor } from "./money";
import { clientOrThrow, currentOrganizationOrThrow, localBusinessDate } from "./shared";

import type { Context } from "../../context";
import type {
  ClientResourceIdInput,
  CreateInvoiceInput,
  IssueInvoiceInput,
  ListInvoicesInput,
  RecordInvoicePaymentInput,
  UpdateInvoiceInput,
} from "../../validations/clients";

const invoiceSelection = {
  invoice: invoices,
  client: clients,
  project: projects,
  commercialContract: commercialContracts,
  branch: branches,
};

function invoiceQuery(ctx: Context) {
  return ctx.db
    .select(invoiceSelection)
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(projects, eq(invoices.projectId, projects.id))
    .leftJoin(commercialContracts, eq(invoices.commercialContractId, commercialContracts.id))
    .innerJoin(branches, eq(invoices.branchId, branches.id));
}

async function invoiceOrThrow(ctx: Context, invoiceId: string) {
  const [invoice] = await ctx.db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!invoice) notFound("Invoice");
  return invoice;
}

async function validateInvoiceReferences(
  ctx: Context,
  input: {
    organizationId: string;
    clientId: string;
    branchId: string;
    projectId?: string | null;
    commercialContractId?: string | null;
  },
) {
  const client = await clientOrThrow(ctx, input.clientId);
  if (client.organizationId !== input.organizationId)
    badRequest("Client belongs to another Organization");
  const [branch] = await ctx.db
    .select({ id: branches.id })
    .from(branches)
    .where(eq(branches.id, input.branchId))
    .limit(1);
  if (!branch) badRequest("Branch is not available");
  if (input.projectId) {
    const [project] = await ctx.db
      .select({ id: projects.id })
      .from(projects)
      .where(
        and(
          eq(projects.id, input.projectId),
          eq(projects.organizationId, input.organizationId),
          eq(projects.clientId, input.clientId),
        ),
      )
      .limit(1);
    if (!project) badRequest("Project does not belong to this Client");
  }
  if (input.commercialContractId) {
    const [contract] = await ctx.db
      .select({ id: commercialContracts.id })
      .from(commercialContracts)
      .where(
        and(
          eq(commercialContracts.id, input.commercialContractId),
          eq(commercialContracts.organizationId, input.organizationId),
          eq(commercialContracts.clientId, input.clientId),
        ),
      )
      .limit(1);
    if (!contract) badRequest("Commercial Contract does not belong to this Client");
  }
  return client;
}

async function paymentSummary(ctx: Context, invoice: typeof invoices.$inferSelect, asOf: string) {
  const payments = await ctx.db
    .select()
    .from(invoicePayments)
    .where(eq(invoicePayments.invoiceId, invoice.id))
    .orderBy(asc(invoicePayments.paidOn), asc(invoicePayments.createdAt));
  const paidMinor = payments.reduce(
    (sum, payment) => sum + moneyToMinor(payment.amount),
    BigInt(0),
  );
  const totalMinor = moneyToMinor(invoice.totalAmount);
  const outstandingMinor = totalMinor > paidMinor ? totalMinor - paidMinor : BigInt(0);
  const presentationStatus =
    invoice.lifecycleStatus === "draft"
      ? "draft"
      : invoice.lifecycleStatus === "void"
        ? "void"
        : outstandingMinor === BigInt(0)
          ? "paid"
          : invoice.dueOn && asOf > invoice.dueOn
            ? "overdue"
            : "sent";
  return {
    paidAmount: minorToMoney(paidMinor),
    outstandingAmount: minorToMoney(outstandingMinor),
    presentationStatus,
    payments,
  };
}

async function invoiceDetails(ctx: Context, invoiceId: string, asOf?: string) {
  const invoice = await invoiceOrThrow(ctx, invoiceId);
  const client = await clientOrThrow(ctx, invoice.clientId);
  await requirePermission(ctx, "clients.read", client.branchId);
  const [row] = await invoiceQuery(ctx).where(eq(invoices.id, invoiceId)).limit(1);
  if (!row) throw new Error("Invoice details could not be loaded");
  const organization = await currentOrganizationOrThrow(ctx);
  return {
    ...row,
    paymentSummary: await paymentSummary(
      ctx,
      invoice,
      asOf ?? localBusinessDate(organization.timezone),
    ),
  };
}

export async function getInvoice(ctx: Context, input: ClientResourceIdInput) {
  return invoiceDetails(ctx, input.id);
}

export async function listInvoices(ctx: Context, input: ListInvoicesInput) {
  await requirePermission(ctx, "clients.read", input.branchId);
  const organization = await currentOrganizationOrThrow(ctx);
  const filters = [eq(invoices.organizationId, organization.id)];
  if (input.clientId) filters.push(eq(invoices.clientId, input.clientId));
  if (input.branchId) filters.push(eq(invoices.branchId, input.branchId));
  if (input.lifecycleStatus) filters.push(eq(invoices.lifecycleStatus, input.lifecycleStatus));
  const rows = await ctx.db
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(...filters))
    .orderBy(asc(invoices.createdAt));
  return Promise.all(rows.map((row) => invoiceDetails(ctx, row.id, input.asOf)));
}

export async function createInvoice(ctx: Context, input: CreateInvoiceInput) {
  await requirePermission(ctx, "invoices.create", input.branchId);
  const organization = await currentOrganizationOrThrow(ctx);
  const client = await validateInvoiceReferences(ctx, {
    organizationId: organization.id,
    ...input,
  });
  const actorUserId = requireSessionUser(ctx);
  const invoiceId = await withTransaction(ctx, async (ctx) => {
    // Serialised by the database layer: every transaction holds the process-wide
    // SQLite write lock, so no advisory lock is needed here.
    // Numbered the way the paper invoices are: DC-INV-2026-13.
    const year = localBusinessDate(organization.timezone).slice(0, 4);
    const [row] = await ctx.db
      .select({ value: count() })
      .from(invoices)
      .where(
        and(
          eq(invoices.organizationId, organization.id),
          like(invoices.invoiceNumber, `${organization.code}-INV-${year}-%`),
        ),
      );
    const invoiceNumber = `${organization.code}-INV-${year}-${(row?.value ?? 0) + 1}`;
    const [invoice] = await ctx.db
      .insert(invoices)
      .values({
        organizationId: organization.id,
        clientId: client.id,
        projectId: input.projectId ?? null,
        commercialContractId: input.commercialContractId ?? null,
        branchId: input.branchId,
        invoiceNumber,
        currency: input.currency,
        totalAmount: input.totalAmount,
        description: input.description ?? null,
        note: input.note ?? null,
      })
      .returning({ id: invoices.id });
    if (!invoice) throw new Error("Invoice creation failed");
    await ctx.db.insert(clientAuditEntries).values({
      organizationId: organization.id,
      clientId: client.id,
      actorUserId,
      action: "invoice.created",
      entityType: "invoice",
      entityId: invoice.id,
      changeSummary: { invoiceNumber, totalAmount: input.totalAmount, currency: input.currency },
    });
    return invoice.id;
  });
  return invoiceDetails(ctx, invoiceId);
}

export async function updateInvoice(ctx: Context, input: UpdateInvoiceInput) {
  const current = await invoiceOrThrow(ctx, input.id);
  const client = await clientOrThrow(ctx, current.clientId);
  await requirePermission(ctx, "invoices.update", client.branchId);
  if (current.lifecycleStatus !== "draft") conflict("Only a draft Invoice can be edited");
  if (input.branchId && input.branchId !== current.branchId) {
    await requirePermission(ctx, "invoices.update", input.branchId);
  }
  await validateInvoiceReferences(ctx, {
    organizationId: current.organizationId,
    clientId: current.clientId,
    branchId: input.branchId ?? current.branchId,
    projectId: input.projectId === undefined ? current.projectId : input.projectId,
    commercialContractId:
      input.commercialContractId === undefined
        ? current.commercialContractId
        : input.commercialContractId,
  });
  const actorUserId = requireSessionUser(ctx);
  const { id: invoiceId, ...values } = input;
  await withTransaction(ctx, async (ctx) => {
    await ctx.db.update(invoices).set(values).where(eq(invoices.id, invoiceId));
    await ctx.db.insert(clientAuditEntries).values({
      organizationId: current.organizationId,
      clientId: current.clientId,
      actorUserId,
      action: "invoice.updated",
      entityType: "invoice",
      entityId: current.id,
      changeSummary: { changedFields: Object.keys(values) },
    });
  });
  return invoiceDetails(ctx, current.id);
}

export async function issueInvoice(ctx: Context, input: IssueInvoiceInput) {
  const current = await invoiceOrThrow(ctx, input.id);
  const client = await clientOrThrow(ctx, current.clientId);
  await requirePermission(ctx, "invoices.issue", client.branchId);
  if (current.lifecycleStatus !== "draft") conflict("Only a draft Invoice can be issued");
  if (input.dueOn < input.issuedOn) badRequest("Invoice due date cannot be before issue date");
  const actorUserId = requireSessionUser(ctx);
  await withTransaction(ctx, async (ctx) => {
    await ctx.db
      .update(invoices)
      .set({ lifecycleStatus: "issued", issuedOn: input.issuedOn, dueOn: input.dueOn })
      .where(eq(invoices.id, current.id));
    await ctx.db.insert(clientAuditEntries).values({
      organizationId: current.organizationId,
      clientId: current.clientId,
      actorUserId,
      action: "invoice.issued",
      entityType: "invoice",
      entityId: current.id,
      changeSummary: { issuedOn: input.issuedOn, dueOn: input.dueOn },
    });
  });
  return invoiceDetails(ctx, current.id, input.issuedOn);
}

export async function voidInvoice(ctx: Context, input: ClientResourceIdInput) {
  const current = await invoiceOrThrow(ctx, input.id);
  const client = await clientOrThrow(ctx, current.clientId);
  await requirePermission(ctx, "invoices.void", client.branchId);
  if (current.lifecycleStatus === "draft") {
    conflict("A draft Invoice must be issued before it can be voided");
  }
  const summary = await paymentSummary(
    ctx,
    current,
    localBusinessDate((await currentOrganizationOrThrow(ctx)).timezone),
  );
  if (summary.payments.length > 0) conflict("An Invoice with Payments cannot be voided");
  if (current.lifecycleStatus === "void") return invoiceDetails(ctx, current.id);
  const actorUserId = requireSessionUser(ctx);
  await withTransaction(ctx, async (ctx) => {
    await ctx.db
      .update(invoices)
      .set({ lifecycleStatus: "void" })
      .where(eq(invoices.id, current.id));
    await ctx.db.insert(clientAuditEntries).values({
      organizationId: current.organizationId,
      clientId: current.clientId,
      actorUserId,
      action: "invoice.voided",
      entityType: "invoice",
      entityId: current.id,
    });
  });
  return invoiceDetails(ctx, current.id);
}

export async function deleteInvoice(ctx: Context, input: ClientResourceIdInput) {
  const current = await invoiceOrThrow(ctx, input.id);
  const client = await clientOrThrow(ctx, current.clientId);
  await requirePermission(ctx, "invoices.delete", client.branchId);

  const [[payment], [document]] = await Promise.all([
    ctx.db
      .select({ id: invoicePayments.id })
      .from(invoicePayments)
      .where(eq(invoicePayments.invoiceId, current.id))
      .limit(1),
    ctx.db
      .select({ id: clientDocuments.id })
      .from(clientDocuments)
      .where(eq(clientDocuments.invoiceId, current.id))
      .limit(1),
  ]);
  if (payment) {
    conflict("This Invoice has payments recorded, so it cannot be deleted.");
  }
  if (document) {
    conflict(
      "This Invoice has documents linked to it, so it cannot be deleted. Remove them first.",
    );
  }

  const actorUserId = requireSessionUser(ctx);
  await withTransaction(ctx, async (ctx) => {
    await ctx.db.delete(invoices).where(eq(invoices.id, current.id));
    await ctx.db.insert(clientAuditEntries).values({
      organizationId: current.organizationId,
      clientId: current.clientId,
      actorUserId,
      action: "invoice.deleted",
      entityType: "invoice",
      entityId: current.id,
      changeSummary: {
        invoiceNumber: current.invoiceNumber,
        lifecycleStatus: current.lifecycleStatus,
      },
    });
  });
  return { id: current.id };
}

export async function recordInvoicePayment(ctx: Context, input: RecordInvoicePaymentInput) {
  const invoice = await invoiceOrThrow(ctx, input.invoiceId);
  const client = await clientOrThrow(ctx, invoice.clientId);
  await requirePermission(ctx, "payments.record", client.branchId);
  if (invoice.lifecycleStatus !== "issued") conflict("Payments require an issued Invoice");
  if (input.currency !== invoice.currency) badRequest("Payment currency must match the Invoice");
  const [recorder] = await ctx.db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.id, input.recordedByEmployeeId))
    .limit(1);
  if (!recorder) badRequest("Payment recorder is not an Employee");
  const summary = await paymentSummary(ctx, invoice, input.paidOn);
  if (moneyToMinor(input.amount) > moneyToMinor(summary.outstandingAmount)) {
    badRequest("Payment cannot exceed the outstanding Invoice balance");
  }
  const actorUserId = requireSessionUser(ctx);
  const [payment] = await withTransaction(ctx, async (ctx) => {
    const result = await ctx.db
      .insert(invoicePayments)
      .values({
        organizationId: invoice.organizationId,
        ...input,
        method: input.method ?? null,
        reference: input.reference ?? null,
      })
      .returning();
    const recorded = result[0];
    if (!recorded) throw new Error("Invoice Payment creation failed");
    await ctx.db.insert(clientAuditEntries).values({
      organizationId: invoice.organizationId,
      clientId: invoice.clientId,
      actorUserId,
      action: "invoice.payment_recorded",
      entityType: "invoice_payment",
      entityId: recorded.id,
      changeSummary: { amount: input.amount, currency: input.currency },
    });
    return result;
  });
  return payment!;
}
