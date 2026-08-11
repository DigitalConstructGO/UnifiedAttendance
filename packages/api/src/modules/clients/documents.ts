import { randomUUID } from "node:crypto";

import { and, desc, eq, sql } from "drizzle-orm";

import {
  clientAuditEntries,
  clientDocuments,
  commercialContracts,
  employees,
  invoices,
  opportunities,
  people,
  projects,
} from "@UnifiedAttendance/db/schema/index";

import { badRequest, notFound } from "../../errors";
import { withTransaction } from "../../context";
import { requirePermission, requireSessionUser } from "../shared/guards";
import { clientOrThrow } from "./shared";

import type { Context } from "../../context";
import type {
  ClientResourceIdInput,
  CreateClientDocumentInput,
  CreateClientDocumentVersionInput,
  ListClientDocumentsInput,
} from "../../validations/clients";

function documentQuery(ctx: Context) {
  return ctx.db
    .select({ document: clientDocuments, uploaderEmployee: employees, uploaderPerson: people })
    .from(clientDocuments)
    .innerJoin(employees, eq(clientDocuments.uploadedByEmployeeId, employees.id))
    .innerJoin(people, eq(employees.personId, people.id));
}

function shapeDocument(row: Awaited<ReturnType<typeof documentQuery>>[number]) {
  const { uploaderEmployee, uploaderPerson, ...rest } = row;
  return { ...rest, uploader: { employee: uploaderEmployee, person: uploaderPerson } };
}

async function documentOrThrow(ctx: Context, documentId: string) {
  const [document] = await ctx.db
    .select()
    .from(clientDocuments)
    .where(eq(clientDocuments.id, documentId))
    .limit(1);
  if (!document) notFound("Client Document");
  return document;
}

async function validateUploader(ctx: Context, employeeId: string) {
  const [uploader] = await ctx.db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  if (!uploader) badRequest("Document uploader is not an Employee");
}

async function validateDocumentContext(
  ctx: Context,
  input: CreateClientDocumentInput,
  organizationId: string,
) {
  const contexts = [
    input.commercialContractId,
    input.opportunityId,
    input.projectId,
    input.invoiceId,
  ].filter(Boolean);
  if (contexts.length > 1) badRequest("A Client Document may have at most one business context");
  if (input.commercialContractId) {
    const [contract] = await ctx.db
      .select({ clientId: commercialContracts.clientId })
      .from(commercialContracts)
      .where(
        and(
          eq(commercialContracts.id, input.commercialContractId),
          eq(commercialContracts.organizationId, organizationId),
        ),
      )
      .limit(1);
    if (!contract || contract.clientId !== input.clientId) {
      badRequest("Commercial Contract does not belong to the Document Client");
    }
  }
  if (input.opportunityId) {
    const [opportunity] = await ctx.db
      .select({ clientId: opportunities.clientId })
      .from(opportunities)
      .where(
        and(
          eq(opportunities.id, input.opportunityId),
          eq(opportunities.organizationId, organizationId),
        ),
      )
      .limit(1);
    if (!opportunity || opportunity.clientId !== input.clientId) {
      badRequest("Opportunity does not belong to the Document Client");
    }
  }
  if (input.projectId) {
    const [project] = await ctx.db
      .select({ clientId: projects.clientId })
      .from(projects)
      .where(and(eq(projects.id, input.projectId), eq(projects.organizationId, organizationId)))
      .limit(1);
    if (!project || project.clientId !== input.clientId) {
      badRequest("Project does not belong to the Document Client");
    }
  }
  if (input.invoiceId) {
    const [invoice] = await ctx.db
      .select({ clientId: invoices.clientId })
      .from(invoices)
      .where(and(eq(invoices.id, input.invoiceId), eq(invoices.organizationId, organizationId)))
      .limit(1);
    if (!invoice || invoice.clientId !== input.clientId) {
      badRequest("Invoice does not belong to the Document Client");
    }
  }
}

export async function getClientDocument(ctx: Context, input: ClientResourceIdInput) {
  const document = await documentOrThrow(ctx, input.id);
  const client = await clientOrThrow(ctx, document.clientId);
  await requirePermission(
    ctx,
    document.accessLevel === "restricted" ? "client_documents.upload" : "clients.read",
    client.branchId,
  );
  const [row] = await documentQuery(ctx).where(eq(clientDocuments.id, document.id)).limit(1);
  if (!row) throw new Error("Client Document details could not be loaded");
  return shapeDocument(row);
}

export async function listClientDocuments(ctx: Context, input: ListClientDocumentsInput) {
  const client = await clientOrThrow(ctx, input.clientId);
  await requirePermission(ctx, "clients.read", client.branchId);
  const rows = await documentQuery(ctx)
    .where(
      and(
        eq(clientDocuments.clientId, input.clientId),
        input.kind ? eq(clientDocuments.kind, input.kind) : undefined,
      ),
    )
    .orderBy(desc(clientDocuments.uploadedAt), desc(clientDocuments.version));
  return rows.map(shapeDocument);
}

export async function createClientDocument(ctx: Context, input: CreateClientDocumentInput) {
  const client = await clientOrThrow(ctx, input.clientId);
  await requirePermission(ctx, "client_documents.upload", client.branchId);
  await Promise.all([
    validateUploader(ctx, input.uploadedByEmployeeId),
    validateDocumentContext(ctx, input, client.organizationId),
  ]);
  const actorUserId = requireSessionUser(ctx);
  const logicalDocumentId = randomUUID();
  const documentId = await withTransaction(ctx, async (ctx) => {
    const [document] = await ctx.db
      .insert(clientDocuments)
      .values({
        organizationId: client.organizationId,
        clientId: client.id,
        commercialContractId: input.commercialContractId ?? null,
        opportunityId: input.opportunityId ?? null,
        projectId: input.projectId ?? null,
        invoiceId: input.invoiceId ?? null,
        logicalDocumentId,
        kind: input.kind,
        version: 1,
        fileName: input.fileName,
        contentType: input.contentType,
        contentLength: input.contentLength,
        storageKey: `clients/${client.id}/${logicalDocumentId}/1/${randomUUID()}`,
        accessLevel: input.accessLevel ?? "standard",
        uploadedByEmployeeId: input.uploadedByEmployeeId,
      })
      .returning({ id: clientDocuments.id });
    if (!document) throw new Error("Client Document creation failed");
    await ctx.db.insert(clientAuditEntries).values({
      organizationId: client.organizationId,
      clientId: client.id,
      actorUserId,
      action: "client_document.upload_started",
      entityType: "client_document",
      entityId: document.id,
      changeSummary: { kind: input.kind, version: 1, accessLevel: input.accessLevel ?? "standard" },
    });
    return document.id;
  });
  return getClientDocument(ctx, { id: documentId });
}

export async function createClientDocumentVersion(
  ctx: Context,
  input: CreateClientDocumentVersionInput,
) {
  const [latest] = await ctx.db
    .select()
    .from(clientDocuments)
    .where(eq(clientDocuments.logicalDocumentId, input.logicalDocumentId))
    .orderBy(desc(clientDocuments.version))
    .limit(1);
  if (!latest) notFound("Client Document");
  const client = await clientOrThrow(ctx, latest.clientId);
  await requirePermission(ctx, "client_documents.upload", client.branchId);
  await validateUploader(ctx, input.uploadedByEmployeeId);
  const actorUserId = requireSessionUser(ctx);
  const documentId = await withTransaction(ctx, async (ctx) => {
    await ctx.db.execute(sql`select pg_advisory_xact_lock(hashtext(${input.logicalDocumentId}))`);
    const [current] = await ctx.db
      .select()
      .from(clientDocuments)
      .where(eq(clientDocuments.logicalDocumentId, input.logicalDocumentId))
      .orderBy(desc(clientDocuments.version))
      .limit(1);
    if (!current) throw new Error("Client Document version family disappeared");
    const version = current.version + 1;
    const [document] = await ctx.db
      .insert(clientDocuments)
      .values({
        organizationId: current.organizationId,
        clientId: current.clientId,
        commercialContractId: current.commercialContractId,
        opportunityId: current.opportunityId,
        projectId: current.projectId,
        invoiceId: current.invoiceId,
        logicalDocumentId: current.logicalDocumentId,
        kind: current.kind,
        version,
        fileName: input.fileName,
        contentType: input.contentType,
        contentLength: input.contentLength,
        storageKey: `clients/${current.clientId}/${current.logicalDocumentId}/${version}/${randomUUID()}`,
        accessLevel: input.accessLevel ?? current.accessLevel,
        uploadedByEmployeeId: input.uploadedByEmployeeId,
      })
      .returning({ id: clientDocuments.id });
    if (!document) throw new Error("Client Document version creation failed");
    await ctx.db.insert(clientAuditEntries).values({
      organizationId: current.organizationId,
      clientId: current.clientId,
      actorUserId,
      action: "client_document.version_uploaded",
      entityType: "client_document",
      entityId: document.id,
      changeSummary: { logicalDocumentId: current.logicalDocumentId, version },
    });
    return document.id;
  });
  return getClientDocument(ctx, { id: documentId });
}

export async function deleteClientDocument(ctx: Context, input: ClientResourceIdInput) {
  const document = await documentOrThrow(ctx, input.id);
  const client = await clientOrThrow(ctx, document.clientId);
  await requirePermission(ctx, "client_documents.delete", client.branchId);
  const actorUserId = requireSessionUser(ctx);

  return withTransaction(ctx, async (ctx) => {
    const [deleted] = await ctx.db
      .delete(clientDocuments)
      .where(eq(clientDocuments.id, document.id))
      .returning();
    if (!deleted) throw new Error("Client Document deletion failed");
    await ctx.db.insert(clientAuditEntries).values({
      organizationId: client.organizationId,
      clientId: client.id,
      actorUserId,
      action: "client_document.upload_cancelled",
      entityType: "client_document",
      entityId: document.id,
      changeSummary: {
        logicalDocumentId: document.logicalDocumentId,
        version: document.version,
      },
    });
    return deleted;
  });
}
