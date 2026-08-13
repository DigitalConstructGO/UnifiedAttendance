import { and, desc, eq, isNotNull } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import {
  employmentContracts,
  employees,
  people,
  workforceDocuments,
} from "@UnifiedAttendance/db/schema/index";

import { notFound } from "../../errors";
import { withTransaction } from "../../context";
import { requirePermission } from "../shared/guards";

import type {
  CreateWorkforceDocumentInput,
  ListWorkforceDocumentsInput,
} from "../../validations/workforce";
import type { Context } from "../../context";

const PERSON_ASSET_COLUMNS = {
  profile_photo: "profilePhotoUrl",
} as const;

const EXTENSION_BY_CONTENT_TYPE: Record<string, string> = {
  "application/pdf": "pdf",
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

function personAssetColumn(document: { personId: string | null; kind: string }) {
  if (!document.personId) return null;
  return PERSON_ASSET_COLUMNS[document.kind as keyof typeof PERSON_ASSET_COLUMNS] ?? null;
}

function personAssetValue(document: { storageKey: string; contentType: string }) {
  const extension = EXTENSION_BY_CONTENT_TYPE[document.contentType];
  return extension ? `${document.storageKey}.${extension}` : document.storageKey;
}

type DocumentOwner = {
  personId?: string | null;
  cosignerId?: string | null;
  employmentContractId?: string | null;
};

async function requireDocumentPermission(
  ctx: Context,
  permission: "workforce_documents.read" | "workforce_documents.manage",
  owner: DocumentOwner,
) {
  if (owner.personId) {
    const [employee] = await ctx.db
      .select()
      .from(employees)
      .where(eq(employees.personId, owner.personId))
      .limit(1);
    if (!employee) notFound("Employee");
    await requirePermission(ctx, permission, employee.branchId);
    return;
  }
  if (owner.employmentContractId) {
    const [employee] = await ctx.db
      .select({ branchId: employees.branchId })
      .from(employmentContracts)
      .innerJoin(employees, eq(employmentContracts.employeeId, employees.id))
      .where(eq(employmentContracts.id, owner.employmentContractId))
      .limit(1);
    if (!employee) notFound("Employment contract");
    await requirePermission(ctx, permission, employee.branchId);
    return;
  }
  await requirePermission(ctx, permission);
}

function storagePrefix(input: CreateWorkforceDocumentInput) {
  if (input.personId) return `people/${input.personId}`;
  if (input.cosignerId) return `cosigners/${input.cosignerId}`;
  return `contracts/${input.employmentContractId!}`;
}

/** Creates private metadata first; the web route returns the corresponding signed upload URL. */
export async function createWorkforceDocument(ctx: Context, input: CreateWorkforceDocumentInput) {
  await requireDocumentPermission(ctx, "workforce_documents.manage", input);
  const [document] = await ctx.db
    .insert(workforceDocuments)
    .values({
      personId: input.personId ?? null,
      cosignerId: input.cosignerId ?? null,
      employmentContractId: input.employmentContractId ?? null,
      kind: input.kind,
      storageKey: `workforce/${storagePrefix(input)}/${input.kind}/${randomUUID()}`,
      contentType: input.contentType,
      contentLength: input.contentLength,
    })
    .returning();
  return document;
}

export async function finalizeWorkforceDocument(ctx: Context, documentId: string) {
  const [document] = await ctx.db
    .select()
    .from(workforceDocuments)
    .where(eq(workforceDocuments.id, documentId))
    .limit(1);
  if (!document) notFound("Employee document");
  await requireDocumentPermission(ctx, "workforce_documents.manage", document);
  return withTransaction(ctx, async (ctx) => {
    const [finalized] = await ctx.db
      .update(workforceDocuments)
      .set({ finalizedAt: new Date() })
      .where(eq(workforceDocuments.id, documentId))
      .returning();
    const column = personAssetColumn(document);
    if (column && document.personId) {
      await ctx.db
        .update(people)
        .set({ [column]: personAssetValue(document) })
        .where(eq(people.id, document.personId));
    }
    return finalized;
  });
}

/** The finalized documents currently on file for one owner — newest per kind. */
export async function listWorkforceDocuments(ctx: Context, input: ListWorkforceDocumentsInput) {
  await requireDocumentPermission(ctx, "workforce_documents.read", input);
  const owner = input.personId
    ? eq(workforceDocuments.personId, input.personId)
    : input.cosignerId
      ? eq(workforceDocuments.cosignerId, input.cosignerId)
      : eq(workforceDocuments.employmentContractId, input.employmentContractId!);
  const rows = await ctx.db
    .select()
    .from(workforceDocuments)
    .where(and(owner, isNotNull(workforceDocuments.finalizedAt)))
    .orderBy(desc(workforceDocuments.finalizedAt), desc(workforceDocuments.createdAt));
  const kinds = new Set<string>();
  return rows.filter((row) => {
    if (kinds.has(row.kind)) return false;
    kinds.add(row.kind);
    return true;
  });
}

export async function getWorkforceDocument(ctx: Context, documentId: string) {
  const [document] = await ctx.db
    .select()
    .from(workforceDocuments)
    .where(eq(workforceDocuments.id, documentId))
    .limit(1);
  if (!document) notFound("Employee document");
  await requireDocumentPermission(ctx, "workforce_documents.read", document);
  return document;
}

export async function deleteWorkforceDocument(ctx: Context, documentId: string) {
  const document = await getWorkforceDocument(ctx, documentId);
  await requireDocumentPermission(ctx, "workforce_documents.manage", document);
  return withTransaction(ctx, async (ctx) => {
    await ctx.db.delete(workforceDocuments).where(eq(workforceDocuments.id, documentId));
    const column = personAssetColumn(document);
    if (column && document.personId) {
      await ctx.db
        .update(people)
        .set({ [column]: null })
        .where(
          and(eq(people.id, document.personId), eq(people[column], personAssetValue(document))),
        );
    }
    return document;
  });
}
