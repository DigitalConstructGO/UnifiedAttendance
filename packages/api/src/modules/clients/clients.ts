import { and, asc, count, eq, ilike, isNull, ne, or, sql } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import {
  branches,
  clientAuditEntries,
  clientOwnerAssignments,
  clientTypes,
  clients,
  companySizes,
  employees,
  industries,
  people,
} from "@UnifiedAttendance/db/schema/index";

import { badRequest, conflict } from "../../errors";
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
  companySize: companySizes,
  ownerEmployee: employees,
  ownerPerson: people,
};

function clientQuery() {
  return db
    .select(clientSelection)
    .from(clients)
    .innerJoin(branches, eq(clients.branchId, branches.id))
    .innerJoin(industries, eq(clients.industryId, industries.id))
    .innerJoin(clientTypes, eq(clients.clientTypeId, clientTypes.id))
    .leftJoin(companySizes, eq(clients.companySizeId, companySizes.id))
    .innerJoin(employees, eq(clients.ownerEmployeeId, employees.id))
    .innerJoin(people, eq(employees.personId, people.id));
}

function shapeClient(row: Awaited<ReturnType<typeof clientQuery>>[number]) {
  const { ownerEmployee, ownerPerson, ...rest } = row;
  return { ...rest, owner: { employee: ownerEmployee, person: ownerPerson } };
}

export async function createClient(ctx: Context, input: CreateClientInput) {
  await requirePermission(ctx, "clients:manage", input.branchId);
  const actorUserId = requireSessionUser(ctx);
  const organization = await currentOrganizationOrThrow();
  await validateClientReferences({ organizationId: organization.id, ...input });
  const relationshipStartedOn =
    input.relationshipStartedOn ?? localBusinessDate(organization.timezone);

  return db.transaction(async (tx) => {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${organization.id}))`);
    const year = relationshipStartedOn.slice(0, 4);
    const [row] = await tx
      .select({ value: count() })
      .from(clients)
      .where(
        and(
          eq(clients.organizationId, organization.id),
          ilike(clients.clientCode, `CLI-${year}-%`),
        ),
      );
    const clientCode = `CLI-${year}-${String((row?.value ?? 0) + 1).padStart(6, "0")}`;
    const [client] = await tx
      .insert(clients)
      .values({
        organizationId: organization.id,
        branchId: input.branchId,
        ownerEmployeeId: input.ownerEmployeeId,
        clientCode,
        legalName: input.legalName,
        industryId: input.industryId,
        clientTypeId: input.clientTypeId,
        phone: input.phone ?? null,
        email: input.email ?? null,
        relationshipStartedOn,
      })
      .returning();
    if (!client) throw new Error("Client creation failed");
    const [ownerAssignment] = await tx
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
    await tx.insert(clientAuditEntries).values({
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
  const client = await clientOrThrow(input.id);
  await requirePermission(ctx, "clients:read", client.branchId);
  const [row] = await clientQuery().where(eq(clients.id, input.id)).limit(1);
  if (!row) throw new Error("Client details could not be loaded");
  return shapeClient(row);
}

export async function listClients(ctx: Context, input: ListClientsInput) {
  await requirePermission(ctx, "clients:read", input.branchId);
  const organization = await currentOrganizationOrThrow();
  const filters = [eq(clients.organizationId, organization.id)];
  if (input.branchId) filters.push(eq(clients.branchId, input.branchId));
  if (input.industryId) filters.push(eq(clients.industryId, input.industryId));
  if (input.ownerEmployeeId) filters.push(eq(clients.ownerEmployeeId, input.ownerEmployeeId));
  if (input.status) filters.push(eq(clients.status, input.status));
  if (input.search) {
    const pattern = `%${input.search}%`;
    const search = or(
      ilike(clients.legalName, pattern),
      ilike(clients.tradingName, pattern),
      ilike(clients.clientCode, pattern),
      ilike(clients.email, pattern),
    );
    if (search) filters.push(search);
  }
  const where = and(...filters);
  const page = input.page ?? 1;
  const pageSize = input.pageSize ?? 25;
  const hasDerivedFilter = Boolean(input.directoryStatus || input.pipelineStageId);
  const [rows, [totalRow]] = await Promise.all([
    hasDerivedFilter
      ? clientQuery().where(where).orderBy(asc(clients.legalName))
      : clientQuery()
          .where(where)
          .orderBy(asc(clients.legalName))
          .limit(pageSize)
          .offset((page - 1) * pageSize),
    db.select({ value: count() }).from(clients).where(where),
  ]);
  const directoryMetrics = await getClientDirectoryMetrics(
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
  const current = await clientOrThrow(input.id);
  await requirePermission(ctx, "clients:manage", current.branchId);
  if (input.branchId && input.branchId !== current.branchId) {
    await requirePermission(ctx, "clients:manage", input.branchId);
  }
  const organization = await currentOrganizationOrThrow();
  await validateClientReferences({
    organizationId: organization.id,
    branchId: input.branchId ?? current.branchId,
    ownerEmployeeId: input.ownerEmployeeId ?? current.ownerEmployeeId,
    industryId: input.industryId ?? current.industryId,
    clientTypeId: input.clientTypeId ?? current.clientTypeId,
    companySizeId: input.companySizeId === undefined ? current.companySizeId : input.companySizeId,
  });
  const foundedYear = input.foundedYear === undefined ? current.foundedYear : input.foundedYear;
  const foundedCalendar =
    input.foundedCalendar === undefined ? current.foundedCalendar : input.foundedCalendar;
  if ((foundedYear === null) !== (foundedCalendar === null)) {
    badRequest("Founded year and calendar must be provided or cleared together");
  }
  if (input.tin && input.tin !== current.tin) {
    const [duplicate] = await db
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
  const { id: clientId, ownerEmployeeId, ...values } = input;
  const reassigned = ownerEmployeeId !== undefined && ownerEmployeeId !== current.ownerEmployeeId;
  const changedFields = Object.keys(values).filter(
    (key) => values[key as keyof typeof values] !== undefined,
  );
  await db.transaction(async (tx) => {
    await tx
      .update(clients)
      .set({
        ...values,
        ...(ownerEmployeeId === undefined ? {} : { ownerEmployeeId }),
      })
      .where(eq(clients.id, clientId));
    if (ownerEmployeeId && reassigned) {
      const effectiveAt = new Date();
      await tx
        .update(clientOwnerAssignments)
        .set({ effectiveTo: effectiveAt })
        .where(
          and(
            eq(clientOwnerAssignments.clientId, clientId),
            isNull(clientOwnerAssignments.effectiveTo),
          ),
        );
      await tx.insert(clientOwnerAssignments).values({
        organizationId: organization.id,
        clientId,
        ownerEmployeeId,
        assignedByUserId: actorUserId,
        effectiveFrom: effectiveAt,
      });
      changedFields.push("ownerEmployeeId");
    }
    await tx.insert(clientAuditEntries).values({
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
  const client = await clientOrThrow(input.id);
  await requirePermission(ctx, "clients:read", client.branchId);
  const rows = await db
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
  const current = await clientOrThrow(input.id);
  await requirePermission(ctx, "clients:manage", current.branchId);
  if (current.status === "archived") return current;
  const actorUserId = requireSessionUser(ctx);
  const [archived] = await db.transaction(async (tx) => {
    const result = await tx
      .update(clients)
      .set({ status: "archived", archivedAt: new Date() })
      .where(eq(clients.id, input.id))
      .returning();
    await tx.insert(clientAuditEntries).values({
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
