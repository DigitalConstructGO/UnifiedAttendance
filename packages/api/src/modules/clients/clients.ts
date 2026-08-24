import { and, asc, count, eq, like, isNull, ne, or, sql } from "drizzle-orm";

import {
  branches,
  clientAuditEntries,
  clientContacts,
  clientDocuments,
  clientNotes,
  clientOwnerAssignments,
  clientTypes,
  clients,
  commercialContracts,
  crmActivities,
  employees,
  industries,
  invoices,
  people,
  projects,
} from "@UnifiedAttendance/db/schema/index";

import { badRequest, conflict } from "../../errors";
import { withTransaction } from "../../context";
import { requirePermission, requireSessionUser } from "../shared/guards";
import { getClientDirectoryMetrics } from "./directory";
import {
  clientOrThrow,
  currentOrganizationOrThrow,
  localBusinessDate,
  validateClientReferences,
} from "./shared";

import type { Context } from "../../context";
import type {
  ClientResourceIdInput,
  CreateClientInput,
  ListClientsInput,
  UpdateClientInput,
} from "../../validations/clients";

const clientSelection = {
  client: clients,
  branch: branches,
  industry: industries,
  clientType: clientTypes,
  ownerEmployee: employees,
  ownerPerson: people,
};

function clientQuery(ctx: Context) {
  return ctx.db
    .select(clientSelection)
    .from(clients)
    .innerJoin(branches, eq(clients.branchId, branches.id))
    .innerJoin(industries, eq(clients.industryId, industries.id))
    .innerJoin(clientTypes, eq(clients.clientTypeId, clientTypes.id))
    .innerJoin(employees, eq(clients.ownerEmployeeId, employees.id))
    .innerJoin(people, eq(employees.personId, people.id));
}

function shapeClient(row: Awaited<ReturnType<typeof clientQuery>>[number]) {
  const { ownerEmployee, ownerPerson, ...rest } = row;
  return { ...rest, owner: { employee: ownerEmployee, person: ownerPerson } };
}

/**
 * Industry and client type are typed as text: the typed name resolves to its
 * catalog row, reviving an archived one or creating a fresh one when the name
 * is new. Picking by id still works for callers that have one.
 */
async function catalogEntryId(
  ctx: Context,
  table: typeof industries | typeof clientTypes,
  organizationId: string,
  chosenId: string | undefined,
  typedName: string | undefined,
  label: string,
): Promise<string> {
  if (chosenId) return chosenId;
  if (!typedName) badRequest(`${label} is required`);
  const sameName = and(
    eq(table.organizationId, organizationId),
    sql`lower(${table.name}) = lower(${typedName})`,
  );
  const [existing] = await ctx.db
    .select({ id: table.id, status: table.status })
    .from(table)
    .where(sameName)
    .limit(1);
  if (existing) {
    if (existing.status !== "active") {
      await ctx.db.update(table).set({ status: "active" }).where(eq(table.id, existing.id));
    }
    return existing.id;
  }
  const [created] = await ctx.db
    .insert(table)
    .values({ organizationId, name: typedName })
    .onConflictDoNothing()
    .returning({ id: table.id });
  if (created) return created.id;
  // Lost a race with a concurrent creator; the row exists now.
  const [raced] = await ctx.db.select({ id: table.id }).from(table).where(sameName).limit(1);
  if (!raced) throw new Error(`Could not resolve the catalog entry "${typedName}"`);
  return raced.id;
}

export async function createClient(ctx: Context, input: CreateClientInput) {
  await requirePermission(ctx, "clients.create", input.branchId);
  const actorUserId = requireSessionUser(ctx);
  const organization = await currentOrganizationOrThrow(ctx);
  const industryId = await catalogEntryId(
    ctx,
    industries,
    organization.id,
    input.industryId,
    input.industry,
    "Industry",
  );
  const clientTypeId = await catalogEntryId(
    ctx,
    clientTypes,
    organization.id,
    input.clientTypeId,
    input.clientType,
    "Client type",
  );
  await validateClientReferences(ctx, {
    organizationId: organization.id,
    ...input,
    industryId,
    clientTypeId,
  });
  const relationshipStartedOn =
    input.relationshipStartedOn ?? localBusinessDate(organization.timezone);

  return withTransaction(ctx, async (ctx) => {
    // Serialised by the database layer: every transaction holds the process-wide
    // SQLite write lock, so no advisory lock is needed here.

    if (input.tin) {
      const [duplicate] = await ctx.db
        .select({ clientCode: clients.clientCode })
        .from(clients)
        .where(and(eq(clients.organizationId, organization.id), eq(clients.tin, input.tin)))
        .limit(1);
      if (duplicate) conflict(`TIN ${input.tin} already belongs to ${duplicate.clientCode}`);
    }

    const year = relationshipStartedOn.slice(0, 4);
    const [row] = await ctx.db
      .select({ value: count() })
      .from(clients)
      .where(
        and(eq(clients.organizationId, organization.id), like(clients.clientCode, `CLI-${year}-%`)),
      );
    const clientCode = `CLI-${year}-${String((row?.value ?? 0) + 1).padStart(6, "0")}`;
    const [client] = await ctx.db
      .insert(clients)
      .values({
        organizationId: organization.id,
        branchId: input.branchId,
        ownerEmployeeId: input.ownerEmployeeId,
        clientCode,
        legalName: input.legalName,
        tradingName: input.tradingName ?? null,
        industryId,
        clientTypeId,
        phone: input.phone ?? null,
        email: input.email ?? null,
        tin: input.tin ?? null,
        vatNumber: input.vatNumber ?? null,
        registrationNumber: input.registrationNumber ?? null,
        businessLicenseNumber: input.businessLicenseNumber ?? null,
        relationshipStartedOn,
      })
      .returning();
    if (!client) throw new Error("Client creation failed");
    const [ownerAssignment] = await ctx.db
      .insert(clientOwnerAssignments)
      .values({
        organizationId: organization.id,
        clientId: client.id,
        ownerEmployeeId: input.ownerEmployeeId,
        assignedByUserId: actorUserId,
        effectiveFrom: new Date(),
      })
      .returning();
    if (!ownerAssignment) throw new Error("Client owner assignment creation failed");
    await ctx.db.insert(clientAuditEntries).values({
      organizationId: organization.id,
      clientId: client.id,
      actorUserId,
      action: "client.created",
      entityType: "client",
      entityId: client.id,
      changeSummary: { clientCode, ownerEmployeeId: input.ownerEmployeeId },
    });
    return { client, ownerAssignment };
  });
}

export async function getClient(ctx: Context, input: ClientResourceIdInput) {
  const client = await clientOrThrow(ctx, input.id);
  await requirePermission(ctx, "clients.read", client.branchId);
  const [row] = await clientQuery(ctx).where(eq(clients.id, input.id)).limit(1);
  if (!row) throw new Error("Client details could not be loaded");
  return shapeClient(row);
}

export async function listClients(ctx: Context, input: ListClientsInput) {
  await requirePermission(ctx, "clients.read", input.branchId);
  const organization = await currentOrganizationOrThrow(ctx);
  const filters = [eq(clients.organizationId, organization.id)];
  if (input.branchId) filters.push(eq(clients.branchId, input.branchId));
  if (input.industryId) filters.push(eq(clients.industryId, input.industryId));
  if (input.ownerEmployeeId) filters.push(eq(clients.ownerEmployeeId, input.ownerEmployeeId));
  if (input.status) {
    filters.push(eq(clients.status, input.status));
  } else if (input.directoryStatus !== "archived") {
    // Archived clients stay out of the directory unless explicitly asked for,
    // the same way archived employees only appear in their archive panel.
    filters.push(eq(clients.status, "active"));
  }
  if (input.search) {
    const pattern = `%${input.search}%`;
    const search = or(
      like(clients.legalName, pattern),
      like(clients.tradingName, pattern),
      like(clients.clientCode, pattern),
      like(clients.email, pattern),
    );
    if (search) filters.push(search);
  }
  const where = and(...filters);
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 25;
  const hasDerivedFilter = Boolean(input.directoryStatus || input.pipelineStageId);
  const [rows, [totalRow]] = await Promise.all([
    hasDerivedFilter
      ? clientQuery(ctx).where(where).orderBy(asc(clients.legalName))
      : clientQuery(ctx)
          .where(where)
          .orderBy(asc(clients.legalName))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
    ctx.db.select({ value: count() }).from(clients).where(where),
  ]);
  const directoryMetrics = await getClientDirectoryMetrics(
    ctx,
    rows.map(({ client }) => ({ id: client.id, status: client.status })),
  );
  const enrichedRows = rows
    .map((row) => ({
      ...shapeClient(row),
      ...directoryMetrics.get(row.client.id),
    }))
    .filter((row) => {
      if (input.directoryStatus && row.directoryStatus?.kind !== input.directoryStatus) {
        return false;
      }
      if (
        input.pipelineStageId &&
        (row.directoryStatus?.kind !== "pipeline_stage" ||
          row.directoryStatus.pipelineStageId !== input.pipelineStageId)
      ) {
        return false;
      }
      return true;
    });
  return {
    items: hasDerivedFilter
      ? enrichedRows.slice((page - 1) * pageSize, page * pageSize)
      : enrichedRows,
    total: hasDerivedFilter ? enrichedRows.length : (totalRow?.value ?? 0),
    page,
    pageSize,
  };
}

export async function updateClient(ctx: Context, input: UpdateClientInput) {
  const current = await clientOrThrow(ctx, input.id);
  await requirePermission(ctx, "clients.update", current.branchId);
  if (input.branchId && input.branchId !== current.branchId) {
    await requirePermission(ctx, "clients.update", input.branchId);
  }
  const organization = await currentOrganizationOrThrow(ctx);
  const industryId =
    input.industryId || input.industry
      ? await catalogEntryId(
          ctx,
          industries,
          organization.id,
          input.industryId,
          input.industry,
          "Industry",
        )
      : current.industryId;
  const clientTypeId =
    input.clientTypeId || input.clientType
      ? await catalogEntryId(
          ctx,
          clientTypes,
          organization.id,
          input.clientTypeId,
          input.clientType,
          "Client type",
        )
      : current.clientTypeId;
  await validateClientReferences(ctx, {
    organizationId: organization.id,
    branchId: input.branchId ?? current.branchId,
    ownerEmployeeId: input.ownerEmployeeId ?? current.ownerEmployeeId,
    industryId,
    clientTypeId,
  });
  if (input.tin && input.tin !== current.tin) {
    const [duplicate] = await ctx.db
      .select({ id: clients.id })
      .from(clients)
      .where(
        and(
          eq(clients.organizationId, organization.id),
          eq(clients.tin, input.tin),
          ne(clients.id, current.id),
        ),
      )
      .limit(1);
    if (duplicate) conflict("Client TIN already exists");
  }

  const actorUserId = requireSessionUser(ctx);
  const {
    id: clientId,
    ownerEmployeeId,
    industry: _industry,
    industryId: _industryId,
    clientType: _clientType,
    clientTypeId: _clientTypeId,
    ...values
  } = input;
  const reassigned = ownerEmployeeId !== undefined && ownerEmployeeId !== current.ownerEmployeeId;
  const changedFields = Object.keys(values).filter(
    (key) => values[key as keyof typeof values] !== undefined,
  );
  if (industryId !== current.industryId) changedFields.push("industryId");
  if (clientTypeId !== current.clientTypeId) changedFields.push("clientTypeId");
  await withTransaction(ctx, async (ctx) => {
    await ctx.db
      .update(clients)
      .set({
        ...values,
        ...(industryId === current.industryId ? {} : { industryId }),
        ...(clientTypeId === current.clientTypeId ? {} : { clientTypeId }),
        ...(ownerEmployeeId === undefined ? {} : { ownerEmployeeId }),
      })
      .where(eq(clients.id, clientId));
    if (ownerEmployeeId && reassigned) {
      const effectiveAt = new Date();
      await ctx.db
        .update(clientOwnerAssignments)
        .set({ effectiveTo: effectiveAt })
        .where(
          and(
            eq(clientOwnerAssignments.clientId, clientId),
            isNull(clientOwnerAssignments.effectiveTo),
          ),
        );
      await ctx.db.insert(clientOwnerAssignments).values({
        organizationId: organization.id,
        clientId,
        ownerEmployeeId,
        assignedByUserId: actorUserId,
        effectiveFrom: effectiveAt,
      });
      changedFields.push("ownerEmployeeId");
    }
    await ctx.db.insert(clientAuditEntries).values({
      organizationId: organization.id,
      clientId,
      actorUserId,
      action: reassigned ? "client.updated_and_reassigned" : "client.updated",
      entityType: "client",
      entityId: clientId,
      changeSummary: { changedFields },
    });
  });
  return getClient(ctx, { id: clientId });
}

export async function listClientOwnerAssignments(ctx: Context, input: ClientResourceIdInput) {
  const client = await clientOrThrow(ctx, input.id);
  await requirePermission(ctx, "clients.read", client.branchId);
  const rows = await ctx.db
    .select({ assignment: clientOwnerAssignments, employee: employees, person: people })
    .from(clientOwnerAssignments)
    .innerJoin(employees, eq(clientOwnerAssignments.ownerEmployeeId, employees.id))
    .innerJoin(people, eq(employees.personId, people.id))
    .where(eq(clientOwnerAssignments.clientId, input.id))
    .orderBy(asc(clientOwnerAssignments.effectiveFrom));
  return rows.map(({ assignment, employee, person }) => ({
    assignment,
    owner: { employee, person },
  }));
}

export async function archiveClient(ctx: Context, input: ClientResourceIdInput) {
  const current = await clientOrThrow(ctx, input.id);
  await requirePermission(ctx, "clients.archive", current.branchId);
  if (current.status === "archived") return current;
  const actorUserId = requireSessionUser(ctx);
  const [archived] = await withTransaction(ctx, async (ctx) => {
    const result = await ctx.db
      .update(clients)
      .set({ status: "archived", archivedAt: new Date() })
      .where(eq(clients.id, input.id))
      .returning();
    await ctx.db.insert(clientAuditEntries).values({
      organizationId: current.organizationId,
      clientId: current.id,
      actorUserId,
      action: "client.archived",
      entityType: "client",
      entityId: current.id,
      changeSummary: { from: current.status, to: "archived" },
    });
    return result;
  });
  if (!archived) throw new Error("Client archive failed");
  return archived;
}

export async function restoreClient(ctx: Context, input: ClientResourceIdInput) {
  const current = await clientOrThrow(ctx, input.id);
  await requirePermission(ctx, "clients.restore", current.branchId);
  if (current.status !== "archived") return current;
  const actorUserId = requireSessionUser(ctx);
  const [restored] = await withTransaction(ctx, async (ctx) => {
    const result = await ctx.db
      .update(clients)
      .set({ status: "active", archivedAt: null })
      .where(eq(clients.id, current.id))
      .returning();
    await ctx.db.insert(clientAuditEntries).values({
      organizationId: current.organizationId,
      clientId: current.id,
      actorUserId,
      action: "client.restored",
      entityType: "client",
      entityId: current.id,
      changeSummary: { from: current.status, to: "active" },
    });
    return result;
  });
  if (!restored) throw new Error("Client restore failed");
  return restored;
}

export async function deleteClient(ctx: Context, input: ClientResourceIdInput) {
  const current = await clientOrThrow(ctx, input.id);
  await requirePermission(ctx, "clients.delete", current.branchId);
  if (current.status !== "archived") {
    badRequest("Archive this Client first — deletion is only allowed from the archive");
  }

  const [[contract], [project], [invoice], [document]] = await Promise.all([
    ctx.db
      .select({ id: commercialContracts.id })
      .from(commercialContracts)
      .where(eq(commercialContracts.clientId, current.id))
      .limit(1),
    ctx.db
      .select({ id: projects.id })
      .from(projects)
      .where(eq(projects.clientId, current.id))
      .limit(1),
    ctx.db
      .select({ id: invoices.id })
      .from(invoices)
      .where(eq(invoices.clientId, current.id))
      .limit(1),
    ctx.db
      .select({ id: clientDocuments.id })
      .from(clientDocuments)
      .where(eq(clientDocuments.clientId, current.id))
      .limit(1),
  ]);
  if (contract) {
    conflict(
      "This Client has commercial contracts, so it cannot be deleted. Keep it archived instead.",
    );
  }
  if (project) {
    conflict("This Client has projects, so it cannot be deleted. Keep it archived instead.");
  }
  if (invoice) {
    conflict("This Client has invoices, so it cannot be deleted. Keep it archived instead.");
  }
  if (document) {
    conflict("This Client has documents, so it cannot be deleted. Keep it archived instead.");
  }

  await withTransaction(ctx, async (ctx) => {
    // Contacts, notes, and CRM activities are lightweight relationship data
    // with no permanent-delete path of their own — "permanently erases the
    // Client" already covers them, unlike the committed records blocked above.
    await ctx.db.delete(crmActivities).where(eq(crmActivities.clientId, current.id));
    await ctx.db.delete(clientNotes).where(eq(clientNotes.clientId, current.id));
    await ctx.db.delete(clientContacts).where(eq(clientContacts.clientId, current.id));
    await ctx.db.delete(clientAuditEntries).where(eq(clientAuditEntries.clientId, current.id));
    await ctx.db
      .delete(clientOwnerAssignments)
      .where(eq(clientOwnerAssignments.clientId, current.id));
    await ctx.db.delete(clients).where(eq(clients.id, current.id));
  });
  return { id: current.id };
}
