import { and, asc, eq, ne, sql } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import { clientAuditEntries, clientContacts } from "@UnifiedAttendance/db/schema/index";

import { badRequest, notFound } from "../../errors";
import { requirePermission, requireSessionUser } from "../shared/guards";
import { clientOrThrow } from "./shared";

import type { Context } from "../../context";
import type {
  ClientResourceIdInput,
  CreateClientContactInput,
  ListClientContactsInput,
  UpdateClientContactInput,
} from "../../validations/clients";

function hasReachableChannel(value: {
  phone?: string | null;
  email?: string | null;
  telegramHandle?: string | null;
}) {
  return [value.phone, value.email, value.telegramHandle].some(
    (channel) => typeof channel === "string" && channel.trim().length > 0,
  );
}

async function contactOrThrow(contactId: string) {
  const [contact] = await db
    .select()
    .from(clientContacts)
    .where(eq(clientContacts.id, contactId))
    .limit(1);
  if (!contact) notFound("Client Contact");
  return contact;
}

export async function listClientContacts(ctx: Context, input: ListClientContactsInput) {
  const client = await clientOrThrow(input.clientId);
  await requirePermission(ctx, "clients:read", client.branchId);
  return db
    .select()
    .from(clientContacts)
    .where(
      and(
        eq(clientContacts.clientId, input.clientId),
        input.includeInactive ? undefined : eq(clientContacts.status, "active"),
      ),
    )
    .orderBy(asc(clientContacts.createdAt));
}

export async function createClientContact(ctx: Context, input: CreateClientContactInput) {
  const client = await clientOrThrow(input.clientId);
  await requirePermission(ctx, "clients:manage", client.branchId);
  if (!hasReachableChannel(input)) {
    badRequest("An active Client Contact requires a phone, email, or Telegram handle");
  }
  const actorUserId = requireSessionUser(ctx);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${client.id}))`);
    if (input.isPrimary) {
      await tx
        .update(clientContacts)
        .set({ isPrimary: false })
        .where(
          and(
            eq(clientContacts.clientId, client.id),
            eq(clientContacts.status, "active"),
            eq(clientContacts.isPrimary, true),
          ),
        );
    }
    const [contact] = await tx
      .insert(clientContacts)
      .values({
        organizationId: client.organizationId,
        ...input,
        isPrimary: input.isPrimary ?? false,
        middleName: input.middleName ?? null,
        role: input.role ?? null,
        phone: input.phone ?? null,
        email: input.email ?? null,
        telegramHandle: input.telegramHandle ?? null,
      })
      .returning();
    if (!contact) throw new Error("Client Contact creation failed");
    await tx.insert(clientAuditEntries).values({
      organizationId: client.organizationId,
      clientId: client.id,
      actorUserId,
      action: "client_contact.created",
      entityType: "client_contact",
      entityId: contact.id,
      changeSummary: { isPrimary: contact.isPrimary },
    });
    return contact;
  });
}

export async function updateClientContact(ctx: Context, input: UpdateClientContactInput) {
  const current = await contactOrThrow(input.id);
  const client = await clientOrThrow(current.clientId);
  await requirePermission(ctx, "clients:manage", client.branchId);
  const phone = input.phone === undefined ? current.phone : input.phone;
  const email = input.email === undefined ? current.email : input.email;
  const telegramHandle =
    input.telegramHandle === undefined ? current.telegramHandle : input.telegramHandle;
  if (!hasReachableChannel({ phone, email, telegramHandle })) {
    badRequest("An active Client Contact requires a phone, email, or Telegram handle");
  }
  const actorUserId = requireSessionUser(ctx);
  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${client.id}))`);
    if (input.isPrimary) {
      await tx
        .update(clientContacts)
        .set({ isPrimary: false })
        .where(
          and(
            eq(clientContacts.clientId, client.id),
            eq(clientContacts.status, "active"),
            eq(clientContacts.isPrimary, true),
            ne(clientContacts.id, current.id),
          ),
        );
    }
    const { id: contactId, ...values } = input;
    const [contact] = await tx
      .update(clientContacts)
      .set(values)
      .where(eq(clientContacts.id, contactId))
      .returning();
    if (!contact) throw new Error("Client Contact update failed");
    await tx.insert(clientAuditEntries).values({
      organizationId: client.organizationId,
      clientId: client.id,
      actorUserId,
      action: "client_contact.updated",
      entityType: "client_contact",
      entityId: contact.id,
      changeSummary: { changedFields: Object.keys(values) },
    });
    return contact;
  });
}

export async function archiveClientContact(ctx: Context, input: ClientResourceIdInput) {
  const current = await contactOrThrow(input.id);
  const client = await clientOrThrow(current.clientId);
  await requirePermission(ctx, "clients:manage", client.branchId);
  if (current.status === "inactive") return current;
  const actorUserId = requireSessionUser(ctx);
  return db.transaction(async (tx) => {
    const [contact] = await tx
      .update(clientContacts)
      .set({ status: "inactive", isPrimary: false })
      .where(eq(clientContacts.id, current.id))
      .returning();
    if (!contact) throw new Error("Client Contact archive failed");
    await tx.insert(clientAuditEntries).values({
      organizationId: client.organizationId,
      clientId: client.id,
      actorUserId,
      action: "client_contact.archived",
      entityType: "client_contact",
      entityId: contact.id,
    });
    return contact;
  });
}
