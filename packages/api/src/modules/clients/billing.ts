import { and, asc, count, eq, ilike, sql } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import {
  branches,
  clientAuditEntries,
  clients,
  commercialContracts,
  employees,
  invoicePayments,
  invoices,
  projects,
} from "@UnifiedAttendance/db/schema/index";

import { badRequest, conflict, notFound } from "../../errors";
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

function invoiceQuery() {
  return db
    .select(invoiceSelection)
    .from(invoices)
    .innerJoin(clients, eq(invoices.clientId, clients.id))
    .leftJoin(projects, eq(invoices.projectId, projects.id))
    .leftJoin(commercialContracts, eq(invoices.commercialContractId, commercialContracts.id))
    .innerJoin(branches, eq(invoices.branchId, branches.id));
}

async function invoiceOrThrow(invoiceId: string) {
  const [invoice] = await db.select().from(invoices).where(eq(invoices.id, invoiceId)).limit(1);
  if (!invoice) notFound("Invoice");
  return invoice;
}

async function validateInvoiceReferences(input: {
  organizationId: string;
  clientId: string;
  branchId: string;
  projectId?: string | null;
  commercialContractId?: string | null;
}) {
  const client = await clientOrThrow(input.clientId);
  if (client.organizationId !== input.organizationId)
    badRequest("Client belongs to another Organization");
  const [branch] = await db
    .select({ id: branches.id })
    .from(branches)
    .where(eq(branches.id, input.branchId))
    .limit(1);
  if (!branch) badRequest("Branch is not available");
  if (input.projectId) {
    const [project] = await db
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
    const [contract] = await db
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

async function paymentSummary(invoice: typeof invoices.$inferSelect, asOf: string) {
  const payments = await db
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
  const invoice = await invoiceOrThrow(invoiceId);
  const client = await clientOrThrow(invoice.clientId);
  await requirePermission(ctx, "clients:read", client.branchId);
  const [row] = await invoiceQuery().where(eq(invoices.id, invoiceId)).limit(1);
  if (!row) throw new Error("Invoice details could not be loaded");
  const organization = await currentOrganizationOrThrow();
  return {
    ...row,
    paymentSummary: await paymentSummary(invoice, asOf ?? localBusinessDate(organization.timezone)),
  };
}

export async function getInvoice(ctx: Context, input: ClientResourceIdInput) {
  return invoiceDetails(ctx, input.id);
}

export async function listInvoices(ctx: Context, input: ListInvoicesInput) {
  await requirePermission(ctx, "clients:read", input.branchId);
  const organization = await currentOrganizationOrThrow();
  const filters = [eq(invoices.organizationId, organization.id)];
  if (input.clientId) filters.push(eq(invoices.clientId, input.clientId));
  if (input.branchId) filters.push(eq(invoices.branchId, input.branchId));
  if (input.lifecycleStatus) filters.push(eq(invoices.lifecycleStatus, input.lifecycleStatus));
  const rows = await db
    .select({ id: invoices.id })
    .from(invoices)
    .where(and(...filters))
    .orderBy(asc(invoices.createdAt));
  return Promise.all(rows.map((row) => invoiceDetails(ctx, row.id, input.asOf)));
}

export async function createInvoice(ctx: Context, input: CreateInvoiceInput) {
  await requirePermission(ctx, "clients:manage", input.branchId);
  const organization = await currentOrganizationOrThrow();
  const client = await validateInvoiceReferences({ organizationId: organization.id, ...input });
  const actorUserId = requireSessionUser(ctx);
  const invoiceId = await db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${organization.id}))`);
    const year = localBusinessDate(organization.timezone).slice(0, 4);
    const [row] = await tx
      .select({ value: count() })
      .from(invoices)
      .where(
        and(
          eq(invoices.organizationId, organization.id),
          ilike(invoices.invoiceNumber, `INV-${year}-%`),
        ),
      );
    const invoiceNumber = `INV-${year}-${String((row?.value ?? 0) + 1).padStart(6, "0")}`;
    const [invoice] = await tx
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
      })
      .returning({ id: invoices.id });
    if (!invoice) throw new Error("Invoice creation failed");
    await tx.insert(clientAuditEntries).values({
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
  const current = await invoiceOrThrow(input.id);
  const client = await clientOrThrow(current.clientId);
  await requirePermission(ctx, "clients:manage", client.branchId);
  if (current.lifecycleStatus !== "draft") conflict("Only a draft Invoice can be edited");
  if (input.branchId && input.branchId !== current.branchId) {
    await requirePermission(ctx, "clients:manage", input.branchId);
  }
  await validateInvoiceReferences({
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
  await db.transaction(async (tx) => {
    await tx.update(invoices).set(values).where(eq(invoices.id, invoiceId));
    await tx.insert(clientAuditEntries).values({
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
  const current = await invoiceOrThrow(input.id);
  const client = await clientOrThrow(current.clientId);
  await requirePermission(ctx, "clients:manage", client.branchId);
  if (current.lifecycleStatus !== "draft") conflict("Only a draft Invoice can be issued");
  if (input.dueOn < input.issuedOn) badRequest("Invoice due date cannot be before issue date");
  const actorUserId = requireSessionUser(ctx);
  await db.transaction(async (tx) => {
    await tx
      .update(invoices)
      .set({ lifecycleStatus: "issued", issuedOn: input.issuedOn, dueOn: input.dueOn })
      .where(eq(invoices.id, current.id));
    await tx.insert(clientAuditEntries).values({
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
  const current = await invoiceOrThrow(input.id);
  const client = await clientOrThrow(current.clientId);
  await requirePermission(ctx, "clients:manage", client.branchId);
  if (current.lifecycleStatus === "draft") {
    conflict("A draft Invoice must be issued before it can be voided");
  }
  const summary = await paymentSummary(
    current,
    localBusinessDate((await currentOrganizationOrThrow()).timezone),
  );
  if (summary.payments.length > 0) conflict("An Invoice with Payments cannot be voided");
  if (current.lifecycleStatus === "void") return invoiceDetails(ctx, current.id);
  const actorUserId = requireSessionUser(ctx);
  await db.transaction(async (tx) => {
    await tx.update(invoices).set({ lifecycleStatus: "void" }).where(eq(invoices.id, current.id));
    await tx.insert(clientAuditEntries).values({
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

export async function recordInvoicePayment(ctx: Context, input: RecordInvoicePaymentInput) {
  const invoice = await invoiceOrThrow(input.invoiceId);
  const client = await clientOrThrow(invoice.clientId);
  await requirePermission(ctx, "clients:manage", client.branchId);
  if (invoice.lifecycleStatus !== "issued") conflict("Payments require an issued Invoice");
  if (input.currency !== invoice.currency) badRequest("Payment currency must match the Invoice");
  const [recorder] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.id, input.recordedByEmployeeId))
    .limit(1);
  if (!recorder) badRequest("Payment recorder is not an Employee");
  const summary = await paymentSummary(invoice, input.paidOn);
  if (moneyToMinor(input.amount) > moneyToMinor(summary.outstandingAmount)) {
    badRequest("Payment cannot exceed the outstanding Invoice balance");
  }
  const actorUserId = requireSessionUser(ctx);
  const [payment] = await db.transaction(async (tx) => {
    const result = await tx
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
    await tx.insert(clientAuditEntries).values({
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
