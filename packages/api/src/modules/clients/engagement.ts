import { and, desc, eq, isNull } from "drizzle-orm";

import {
  clientAuditEntries,
  clientContacts,
  clientNotes,
  crmActivities,
  employees,
  people,
} from "@UnifiedAttendance/db/schema/index";

import { badRequest, notFound } from "../../errors";
import { withTransaction } from "../../context";
import { requirePermission, requireSessionUser } from "../shared/guards";
import { clientOrThrow } from "./shared";

import type { Context } from "../../context";
import type {
  ClientResourceIdInput,
  CreateClientNoteInput,
  CreateCrmActivityInput,
  ListClientNotesInput,
  ListCrmActivitiesInput,
  UpdateClientNoteInput,
  UpdateCrmActivityInput,
} from "../../validations/clients";

async function employeeExists(ctx: Context, employeeId: string) {
  const [employee] = await ctx.db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  return Boolean(employee);
}

async function noteOrThrow(ctx: Context, noteId: string) {
  const [note] = await ctx.db.select().from(clientNotes).where(eq(clientNotes.id, noteId)).limit(1);
  if (!note) notFound("Client Note");
  return note;
}

export async function listClientNotes(ctx: Context, input: ListClientNotesInput) {
  const client = await clientOrThrow(ctx, input.clientId);
  await requirePermission(ctx, "clients:read", client.branchId);
  const filters = [eq(clientNotes.clientId, input.clientId)];
  if (!input.includeArchived) filters.push(isNull(clientNotes.archivedAt));
  const rows = await ctx.db
    .select({ note: clientNotes, authorEmployee: employees, authorPerson: people })
    .from(clientNotes)
    .innerJoin(employees, eq(clientNotes.authorEmployeeId, employees.id))
    .innerJoin(people, eq(employees.personId, people.id))
    .where(and(...filters))
    .orderBy(desc(clientNotes.isPinned), desc(clientNotes.createdAt));
  return rows.map(({ note, authorEmployee, authorPerson }) => ({
    note,
    author: { employee: authorEmployee, person: authorPerson },
  }));
}

export async function createClientNote(ctx: Context, input: CreateClientNoteInput) {
  const client = await clientOrThrow(ctx, input.clientId);
  await requirePermission(ctx, "clients:manage", client.branchId);
  if (!(await employeeExists(ctx, input.authorEmployeeId)))
    badRequest("Note author is not an Employee");
  const actorUserId = requireSessionUser(ctx);
  const [note] = await withTransaction(ctx, async (ctx) => {
    const result = await ctx.db
      .insert(clientNotes)
      .values({
        organizationId: client.organizationId,
        ...input,
        isPinned: input.isPinned ?? false,
      })
      .returning();
    const created = result[0];
    if (!created) throw new Error("Client Note creation failed");
    await ctx.db.insert(clientAuditEntries).values({
      organizationId: client.organizationId,
      clientId: client.id,
      actorUserId,
      action: "client_note.created",
      entityType: "client_note",
      entityId: created.id,
      changeSummary: { isPinned: created.isPinned },
    });
    return result;
  });
  return note!;
}

export async function updateClientNote(ctx: Context, input: UpdateClientNoteInput) {
  const current = await noteOrThrow(ctx, input.id);
  const client = await clientOrThrow(ctx, current.clientId);
  await requirePermission(ctx, "clients:manage", client.branchId);
  if (current.archivedAt) badRequest("Archived Client Notes cannot be edited");
  const actorUserId = requireSessionUser(ctx);
  const { id: noteId, ...values } = input;
  const [note] = await withTransaction(ctx, async (ctx) => {
    const result = await ctx.db
      .update(clientNotes)
      .set(values)
      .where(eq(clientNotes.id, noteId))
      .returning();
    const updated = result[0];
    if (!updated) throw new Error("Client Note update failed");
    await ctx.db.insert(clientAuditEntries).values({
      organizationId: client.organizationId,
      clientId: client.id,
      actorUserId,
      action: "client_note.updated",
      entityType: "client_note",
      entityId: noteId,
      changeSummary: { changedFields: Object.keys(values) },
    });
    return result;
  });
  return note!;
}

export async function archiveClientNote(ctx: Context, input: ClientResourceIdInput) {
  const current = await noteOrThrow(ctx, input.id);
  const client = await clientOrThrow(ctx, current.clientId);
  await requirePermission(ctx, "clients:manage", client.branchId);
  if (current.archivedAt) return current;
  const actorUserId = requireSessionUser(ctx);
  const [note] = await withTransaction(ctx, async (ctx) => {
    const result = await ctx.db
      .update(clientNotes)
      .set({ archivedAt: new Date() })
      .where(eq(clientNotes.id, current.id))
      .returning();
    const archived = result[0];
    if (!archived) throw new Error("Client Note archive failed");
    await ctx.db.insert(clientAuditEntries).values({
      organizationId: client.organizationId,
      clientId: client.id,
      actorUserId,
      action: "client_note.archived",
      entityType: "client_note",
      entityId: current.id,
    });
    return result;
  });
  return note!;
}

async function resolveActivityTargets(ctx: Context, input: CreateCrmActivityInput) {
  const client = await clientOrThrow(ctx, input.clientId);
  if (input.clientContactId) {
    const [contact] = await ctx.db
      .select({ clientId: clientContacts.clientId })
      .from(clientContacts)
      .where(eq(clientContacts.id, input.clientContactId))
      .limit(1);
    if (!contact || contact.clientId !== client.id) {
      badRequest("Client Contact does not belong to the CRM Activity Client");
    }
  }
  return { client };
}

export async function createCrmActivity(ctx: Context, input: CreateCrmActivityInput) {
  const { client } = await resolveActivityTargets(ctx, input);
  await requirePermission(ctx, "clients:manage", client.branchId);
  if (!(await employeeExists(ctx, input.actorEmployeeId)))
    badRequest("Activity actor is not an Employee");
  const organizationId = client.organizationId;
  const actorUserId = requireSessionUser(ctx);
  const activityId = await withTransaction(ctx, async (ctx) => {
    const [activity] = await ctx.db
      .insert(crmActivities)
      .values({
        organizationId,
        ...input,
        clientContactId: input.clientContactId ?? null,
      })
      .returning({ id: crmActivities.id });
    if (!activity) throw new Error("CRM Activity creation failed");
    await ctx.db.insert(clientAuditEntries).values({
      organizationId,
      clientId: client.id,
      actorUserId,
      action: "crm_activity.created",
      entityType: "crm_activity",
      entityId: activity.id,
    });
    return activity.id;
  });
  const [row] = await activityQuery(ctx).where(eq(crmActivities.id, activityId)).limit(1);
  if (!row) throw new Error("CRM Activity details could not be loaded");
  return shapeActivity(row);
}

async function activityOrThrow(ctx: Context, activityId: string) {
  const [activity] = await ctx.db
    .select()
    .from(crmActivities)
    .where(eq(crmActivities.id, activityId))
    .limit(1);
  if (!activity) notFound("CRM Activity");
  return activity;
}

export async function updateCrmActivity(ctx: Context, input: UpdateCrmActivityInput) {
  const current = await activityOrThrow(ctx, input.id);
  const client = await clientOrThrow(ctx, current.clientId);
  await requirePermission(ctx, "clients:manage", client.branchId);
  const actorUserId = requireSessionUser(ctx);
  const { id: activityId, ...values } = input;
  await withTransaction(ctx, async (ctx) => {
    await ctx.db.update(crmActivities).set(values).where(eq(crmActivities.id, activityId));
    await ctx.db.insert(clientAuditEntries).values({
      organizationId: current.organizationId,
      clientId: client.id,
      actorUserId,
      action: "crm_activity.updated",
      entityType: "crm_activity",
      entityId: current.id,
      changeSummary: { changedFields: Object.keys(values) },
    });
  });
  const [row] = await activityQuery(ctx).where(eq(crmActivities.id, current.id)).limit(1);
  if (!row) throw new Error("CRM Activity details could not be loaded");
  return shapeActivity(row);
}

function activityQuery(ctx: Context) {
  return ctx.db
    .select({
      activity: crmActivities,
      actorEmployee: employees,
      actorPerson: people,
      clientContact: clientContacts,
    })
    .from(crmActivities)
    .innerJoin(employees, eq(crmActivities.actorEmployeeId, employees.id))
    .innerJoin(people, eq(employees.personId, people.id))
    .leftJoin(clientContacts, eq(crmActivities.clientContactId, clientContacts.id));
}

function shapeActivity(row: Awaited<ReturnType<typeof activityQuery>>[number]) {
  const { actorEmployee, actorPerson, ...rest } = row;
  return { ...rest, actor: { employee: actorEmployee, person: actorPerson } };
}

export async function listCrmActivities(ctx: Context, input: ListCrmActivitiesInput) {
  const client = await clientOrThrow(ctx, input.clientId);
  await requirePermission(ctx, "clients:read", client.branchId);
  const rows = await activityQuery(ctx)
    .where(eq(crmActivities.clientId, input.clientId))
    .orderBy(desc(crmActivities.contactDate));
  return rows.map(shapeActivity);
}
