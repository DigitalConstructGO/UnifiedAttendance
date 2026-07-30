import { and, desc, eq, isNull } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import {
  clientAuditEntries,
  clientContacts,
  clientNotes,
  crmActivities,
  employees,
  opportunities,
  people,
} from "@UnifiedAttendance/db/schema/index";

import { badRequest, notFound } from "../../errors";
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

async function employeeExists(employeeId: string) {
  const [employee] = await db
    .select({ id: employees.id })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  return Boolean(employee);
}

async function noteOrThrow(noteId: string) {
  const [note] = await db.select().from(clientNotes).where(eq(clientNotes.id, noteId)).limit(1);
  if (!note) notFound("Client Note");
  return note;
}

export async function listClientNotes(ctx: Context, input: ListClientNotesInput) {
  const client = await clientOrThrow(input.clientId);
  await requirePermission(ctx, "clients:read", client.branchId);
  const filters = [eq(clientNotes.clientId, input.clientId)];
  if (!input.includeArchived) filters.push(isNull(clientNotes.archivedAt));
  const rows = await db
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
  const client = await clientOrThrow(input.clientId);
  await requirePermission(ctx, "clients:manage", client.branchId);
  if (!(await employeeExists(input.authorEmployeeId))) badRequest("Note author is not an Employee");
  const actorUserId = requireSessionUser(ctx);
  const [note] = await db.transaction(async (tx) => {
    const result = await tx
      .insert(clientNotes)
      .values({
        organizationId: client.organizationId,
        ...input,
        isPinned: input.isPinned ?? false,
      })
      .returning();
    const created = result[0];
    if (!created) throw new Error("Client Note creation failed");
    await tx.insert(clientAuditEntries).values({
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
  const current = await noteOrThrow(input.id);
  const client = await clientOrThrow(current.clientId);
  await requirePermission(ctx, "clients:manage", client.branchId);
  if (current.archivedAt) badRequest("Archived Client Notes cannot be edited");
  const actorUserId = requireSessionUser(ctx);
  const { id: noteId, ...values } = input;
  const [note] = await db.transaction(async (tx) => {
    const result = await tx
      .update(clientNotes)
      .set(values)
      .where(eq(clientNotes.id, noteId))
      .returning();
    const updated = result[0];
    if (!updated) throw new Error("Client Note update failed");
    await tx.insert(clientAuditEntries).values({
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
  const current = await noteOrThrow(input.id);
  const client = await clientOrThrow(current.clientId);
  await requirePermission(ctx, "clients:manage", client.branchId);
  if (current.archivedAt) return current;
  const actorUserId = requireSessionUser(ctx);
  const [note] = await db.transaction(async (tx) => {
    const result = await tx
      .update(clientNotes)
      .set({ archivedAt: new Date() })
      .where(eq(clientNotes.id, current.id))
      .returning();
    const archived = result[0];
    if (!archived) throw new Error("Client Note archive failed");
    await tx.insert(clientAuditEntries).values({
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

async function resolveActivityTargets(input: CreateCrmActivityInput) {
  if (!input.clientId && !input.opportunityId) {
    badRequest("CRM Activity requires a Client or Opportunity");
  }
  const client = input.clientId ? await clientOrThrow(input.clientId) : null;
  const [opportunity] = input.opportunityId
    ? await db
        .select()
        .from(opportunities)
        .where(eq(opportunities.id, input.opportunityId))
        .limit(1)
    : [null];
  if (input.opportunityId && !opportunity) notFound("Opportunity");
  if (client && opportunity?.clientId && opportunity.clientId !== client.id) {
    badRequest("CRM Activity Client and Opportunity do not match");
  }
  if (input.clientContactId) {
    if (!client) badRequest("A Client Contact requires a Client target");
    const [contact] = await db
      .select({ clientId: clientContacts.clientId })
      .from(clientContacts)
      .where(eq(clientContacts.id, input.clientContactId))
      .limit(1);
    if (!contact || contact.clientId !== client.id) {
      badRequest("Client Contact does not belong to the CRM Activity Client");
    }
  }
  return { client, opportunity };
}

export async function createCrmActivity(ctx: Context, input: CreateCrmActivityInput) {
  const { client, opportunity } = await resolveActivityTargets(input);
  const branchId = client?.branchId ?? opportunity!.branchId;
  await requirePermission(ctx, "clients:manage", branchId);
  if (!(await employeeExists(input.actorEmployeeId)))
    badRequest("Activity actor is not an Employee");
  const organizationId = client?.organizationId ?? opportunity!.organizationId;
  const actorUserId = requireSessionUser(ctx);
  const activityId = await db.transaction(async (tx) => {
    const [activity] = await tx
      .insert(crmActivities)
      .values({
        organizationId,
        ...input,
        clientId: input.clientId ?? null,
        opportunityId: input.opportunityId ?? null,
        clientContactId: input.clientContactId ?? null,
        details: input.details ?? null,
      })
      .returning({ id: crmActivities.id });
    if (!activity) throw new Error("CRM Activity creation failed");
    if (
      opportunity &&
      (!opportunity.lastActivityAt || opportunity.lastActivityAt < input.occurredAt)
    ) {
      await tx
        .update(opportunities)
        .set({ lastActivityAt: input.occurredAt })
        .where(eq(opportunities.id, opportunity.id));
    }
    if (client) {
      await tx.insert(clientAuditEntries).values({
        organizationId,
        clientId: client.id,
        actorUserId,
        action: "crm_activity.created",
        entityType: "crm_activity",
        entityId: activity.id,
        changeSummary: { activityType: input.activityType },
      });
    }
    return activity.id;
  });
  const [row] = await activityQuery().where(eq(crmActivities.id, activityId)).limit(1);
  if (!row) throw new Error("CRM Activity details could not be loaded");
  return shapeActivity(row);
}

async function activityOrThrow(activityId: string) {
  const [activity] = await db
    .select()
    .from(crmActivities)
    .where(eq(crmActivities.id, activityId))
    .limit(1);
  if (!activity) notFound("CRM Activity");
  return activity;
}

export async function updateCrmActivity(ctx: Context, input: UpdateCrmActivityInput) {
  const current = await activityOrThrow(input.id);
  const client = current.clientId ? await clientOrThrow(current.clientId) : null;
  const [opportunity] =
    !client && current.opportunityId
      ? await db
          .select()
          .from(opportunities)
          .where(eq(opportunities.id, current.opportunityId))
          .limit(1)
      : [null];
  const branchId = client?.branchId ?? opportunity?.branchId;
  if (!branchId) throw new Error("CRM Activity target could not be loaded");
  await requirePermission(ctx, "clients:manage", branchId);
  const actorUserId = requireSessionUser(ctx);
  const { id: activityId, ...values } = input;
  await db.transaction(async (tx) => {
    await tx.update(crmActivities).set(values).where(eq(crmActivities.id, activityId));
    if (client) {
      await tx.insert(clientAuditEntries).values({
        organizationId: current.organizationId,
        clientId: client.id,
        actorUserId,
        action: "crm_activity.updated",
        entityType: "crm_activity",
        entityId: current.id,
        changeSummary: { changedFields: Object.keys(values) },
      });
    }
  });
  const [row] = await activityQuery().where(eq(crmActivities.id, current.id)).limit(1);
  if (!row) throw new Error("CRM Activity details could not be loaded");
  return shapeActivity(row);
}

function activityQuery() {
  return db
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
  if (!input.clientId && !input.opportunityId) {
    badRequest("CRM Activity list requires a Client or Opportunity");
  }
  if (input.clientId) {
    const client = await clientOrThrow(input.clientId);
    await requirePermission(ctx, "clients:read", client.branchId);
  } else {
    const [opportunity] = await db
      .select({ branchId: opportunities.branchId })
      .from(opportunities)
      .where(eq(opportunities.id, input.opportunityId!))
      .limit(1);
    if (!opportunity) notFound("Opportunity");
    await requirePermission(ctx, "clients:read", opportunity.branchId);
  }
  const filters = [];
  if (input.clientId) filters.push(eq(crmActivities.clientId, input.clientId));
  if (input.opportunityId) filters.push(eq(crmActivities.opportunityId, input.opportunityId));
  const rows = await activityQuery()
    .where(and(...filters))
    .orderBy(desc(crmActivities.occurredAt));
  return rows.map(shapeActivity);
}
