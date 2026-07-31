import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import {
  employmentContracts,
  employees,
  workforceDocuments,
} from "@UnifiedAttendance/db/schema/index";

import { notFound } from "../../errors";
import { requirePermission } from "../shared/guards";

import type { CreateWorkforceDocumentInput } from "../../validations/workforce";
import type { Context } from "../../context";

type DocumentOwner = {
  personId?: string | null;
  cosignerId?: string | null;
  employmentContractId?: string | null;
};


async function requireDocumentPermission(
  ctx: Context,
  permission: "workforce:read" | "workforce:manage",
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
  await requireDocumentPermission(ctx, "workforce:manage", input);
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
  await requireDocumentPermission(ctx, "workforce:manage", document);
  const [finalized] = await ctx.db
    .update(workforceDocuments)
    .set({ finalizedAt: new Date() })
    .where(eq(workforceDocuments.id, documentId))
    .returning();
  return finalized;
}

export async function getWorkforceDocument(ctx: Context, documentId: string) {
  const [document] = await ctx.db
    .select()
    .from(workforceDocuments)
    .where(eq(workforceDocuments.id, documentId))
    .limit(1);
  if (!document) notFound("Employee document");
  await requireDocumentPermission(ctx, "workforce:read", document);
  return document;
}

export async function deleteWorkforceDocument(ctx: Context, documentId: string) {
  const document = await getWorkforceDocument(ctx, documentId);
  await requireDocumentPermission(ctx, "workforce:manage", document);
  await ctx.db.delete(workforceDocuments).where(eq(workforceDocuments.id, documentId));
  return document;
}
