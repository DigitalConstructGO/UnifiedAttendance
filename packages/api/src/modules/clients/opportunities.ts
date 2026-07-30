import { and, asc, eq, isNull } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import {
  branches,
  clientAuditEntries,
  clients,
  employees,
  industries,
  opportunities,
  opportunityStageTransitions,
  people,
  pipelineStages,
} from "@UnifiedAttendance/db/schema/index";

import { badRequest, conflict, notFound } from "../../errors";
import { requirePermission, requireSessionUser } from "../shared/guards";
import { clientOrThrow, currentOrganizationOrThrow } from "./shared";

import type { Context } from "../../context";
import type {
  ClientResourceIdInput,
  ConvertOpportunityInput,
  CreateOpportunityInput,
  ListOpportunitiesInput,
  ListOpportunityStageTransitionsInput,
  TransitionOpportunityStageInput,
  UpdateOpportunityInput,
} from "../../validations/clients";

const opportunitySelection = {
  opportunity: opportunities,
  branch: branches,
  client: clients,
  industry: industries,
  ownerEmployee: employees,
  ownerPerson: people,
  pipelineStage: pipelineStages,
};

function opportunityQuery() {
  return db
    .select(opportunitySelection)
    .from(opportunities)
    .innerJoin(branches, eq(opportunities.branchId, branches.id))
    .leftJoin(clients, eq(opportunities.clientId, clients.id))
    .leftJoin(industries, eq(opportunities.industryId, industries.id))
    .innerJoin(employees, eq(opportunities.ownerEmployeeId, employees.id))
    .innerJoin(people, eq(employees.personId, people.id))
    .innerJoin(pipelineStages, eq(opportunities.pipelineStageId, pipelineStages.id));
}

function shapeOpportunity(row: Awaited<ReturnType<typeof opportunityQuery>>[number]) {
  const { ownerEmployee, ownerPerson, ...rest } = row;
  return { ...rest, owner: { employee: ownerEmployee, person: ownerPerson } };
}

async function opportunityOrThrow(opportunityId: string) {
  const [opportunity] = await db
    .select()
    .from(opportunities)
    .where(eq(opportunities.id, opportunityId))
    .limit(1);
  if (!opportunity) notFound("Opportunity");
  return opportunity;
}

async function stageOrThrow(organizationId: string, stageId: string) {
  const [stage] = await db
    .select()
    .from(pipelineStages)
    .where(
      and(
        eq(pipelineStages.id, stageId),
        eq(pipelineStages.organizationId, organizationId),
        eq(pipelineStages.status, "active"),
      ),
    )
    .limit(1);
  if (!stage) badRequest("Pipeline Stage is not active in this Organization");
  return stage;
}

async function validateOpportunityReferences(
  organizationId: string,
  input: Pick<CreateOpportunityInput, "branchId" | "ownerEmployeeId"> & {
    industryId?: string | null;
    clientId?: string | null;
  },
) {
  const [[branch], [owner]] = await Promise.all([
    db.select({ id: branches.id }).from(branches).where(eq(branches.id, input.branchId)).limit(1),
    db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.id, input.ownerEmployeeId))
      .limit(1),
  ]);
  if (!branch) badRequest("Branch is not available");
  if (!owner) badRequest("Opportunity Owner is not available");
  if (input.industryId) {
    const [industry] = await db
      .select({ id: industries.id })
      .from(industries)
      .where(
        and(
          eq(industries.id, input.industryId),
          eq(industries.organizationId, organizationId),
          eq(industries.status, "active"),
        ),
      )
      .limit(1);
    if (!industry) badRequest("Industry is not active in this Organization");
  }
  if (input.clientId) {
    const client = await clientOrThrow(input.clientId);
    if (client.organizationId !== organizationId)
      badRequest("Client belongs to another Organization");
  }
}

function validateValueCurrency(value?: string | null, currency?: string | null) {
  if ((value == null) !== (currency == null)) {
    badRequest("Estimated value and currency must be provided or cleared together");
  }
}

export async function getOpportunity(ctx: Context, input: ClientResourceIdInput) {
  const opportunity = await opportunityOrThrow(input.id);
  await requirePermission(ctx, "clients:read", opportunity.branchId);
  const [row] = await opportunityQuery().where(eq(opportunities.id, input.id)).limit(1);
  if (!row) throw new Error("Opportunity details could not be loaded");
  return shapeOpportunity(row);
}

export async function listOpportunities(ctx: Context, input: ListOpportunitiesInput) {
  await requirePermission(ctx, "clients:read", input.branchId);
  const organization = await currentOrganizationOrThrow();
  const filters = [eq(opportunities.organizationId, organization.id)];
  if (input.branchId) filters.push(eq(opportunities.branchId, input.branchId));
  if (input.clientId) filters.push(eq(opportunities.clientId, input.clientId));
  if (input.ownerEmployeeId) filters.push(eq(opportunities.ownerEmployeeId, input.ownerEmployeeId));
  if (input.pipelineStageId) filters.push(eq(opportunities.pipelineStageId, input.pipelineStageId));
  if (!input.includeClosed) filters.push(isNull(opportunities.closedAt));
  const rows = await opportunityQuery()
    .where(and(...filters))
    .orderBy(asc(pipelineStages.position), asc(opportunities.createdAt));
  return rows.map(shapeOpportunity);
}

export async function createOpportunity(ctx: Context, input: CreateOpportunityInput) {
  await requirePermission(ctx, "clients:manage", input.branchId);
  const organization = await currentOrganizationOrThrow();
  await validateOpportunityReferences(organization.id, input);
  await stageOrThrow(organization.id, input.pipelineStageId);
  validateValueCurrency(input.estimatedValue, input.currency);
  const changedByUserId = requireSessionUser(ctx);
  const occurredAt = new Date();
  const opportunityId = await db.transaction(async (tx) => {
    const [opportunity] = await tx
      .insert(opportunities)
      .values({
        organizationId: organization.id,
        ...input,
        clientId: input.clientId ?? null,
        industryId: input.industryId ?? null,
        estimatedValue: input.estimatedValue ?? null,
        currency: input.currency ?? null,
        priority: input.priority ?? "medium",
      })
      .returning({ id: opportunities.id });
    if (!opportunity) throw new Error("Opportunity creation failed");
    await tx.insert(opportunityStageTransitions).values({
      organizationId: organization.id,
      opportunityId: opportunity.id,
      fromPipelineStageId: null,
      toPipelineStageId: input.pipelineStageId,
      changedByUserId,
      occurredAt,
    });
    if (input.clientId) {
      await tx.insert(clientAuditEntries).values({
        organizationId: organization.id,
        clientId: input.clientId,
        actorUserId: changedByUserId,
        action: "opportunity.created",
        entityType: "opportunity",
        entityId: opportunity.id,
      });
    }
    return opportunity.id;
  });
  return getOpportunity(ctx, { id: opportunityId });
}

export async function updateOpportunity(ctx: Context, input: UpdateOpportunityInput) {
  const current = await opportunityOrThrow(input.id);
  await requirePermission(ctx, "clients:manage", current.branchId);
  if (input.branchId && input.branchId !== current.branchId) {
    await requirePermission(ctx, "clients:manage", input.branchId);
  }
  const branchId = input.branchId ?? current.branchId;
  const ownerEmployeeId = input.ownerEmployeeId ?? current.ownerEmployeeId;
  const industryId = input.industryId === undefined ? current.industryId : input.industryId;
  const estimatedValue =
    input.estimatedValue === undefined ? current.estimatedValue : input.estimatedValue;
  const currency = input.currency === undefined ? current.currency : input.currency;
  await validateOpportunityReferences(current.organizationId, {
    branchId,
    ownerEmployeeId,
    industryId,
    clientId: current.clientId,
  });
  validateValueCurrency(estimatedValue, currency);
  const actorUserId = requireSessionUser(ctx);
  const { id: opportunityId, ...values } = input;
  await db.transaction(async (tx) => {
    await tx.update(opportunities).set(values).where(eq(opportunities.id, opportunityId));
    if (current.clientId) {
      await tx.insert(clientAuditEntries).values({
        organizationId: current.organizationId,
        clientId: current.clientId,
        actorUserId,
        action: "opportunity.updated",
        entityType: "opportunity",
        entityId: current.id,
        changeSummary: { changedFields: Object.keys(values) },
      });
    }
  });
  return getOpportunity(ctx, { id: current.id });
}

export async function transitionOpportunityStage(
  ctx: Context,
  input: TransitionOpportunityStageInput,
) {
  const current = await opportunityOrThrow(input.id);
  await requirePermission(ctx, "clients:manage", current.branchId);
  if (current.pipelineStageId === input.toPipelineStageId) {
    badRequest("Opportunity is already in that Pipeline Stage");
  }
  const stage = await stageOrThrow(current.organizationId, input.toPipelineStageId);
  const changedByUserId = requireSessionUser(ctx);
  const occurredAt = input.occurredAt ?? new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(opportunities)
      .set({
        pipelineStageId: stage.id,
        closedAt: stage.outcome === "open" ? null : occurredAt,
      })
      .where(eq(opportunities.id, current.id));
    await tx.insert(opportunityStageTransitions).values({
      organizationId: current.organizationId,
      opportunityId: current.id,
      fromPipelineStageId: current.pipelineStageId,
      toPipelineStageId: stage.id,
      changedByUserId,
      occurredAt,
      note: input.note ?? null,
    });
    if (current.clientId) {
      await tx.insert(clientAuditEntries).values({
        organizationId: current.organizationId,
        clientId: current.clientId,
        actorUserId: changedByUserId,
        action: "opportunity.stage_changed",
        entityType: "opportunity",
        entityId: current.id,
        changeSummary: { from: current.pipelineStageId, to: stage.id },
      });
    }
  });
  return getOpportunity(ctx, { id: current.id });
}

export async function convertOpportunity(ctx: Context, input: ConvertOpportunityInput) {
  const current = await opportunityOrThrow(input.id);
  await requirePermission(ctx, "clients:manage", current.branchId);
  if (current.convertedAt) conflict("Opportunity has already been converted");
  const client = await clientOrThrow(input.clientId);
  await requirePermission(ctx, "clients:manage", client.branchId);
  if (client.organizationId !== current.organizationId) {
    badRequest("Opportunity and Client belong to different Organizations");
  }
  if (current.clientId && current.clientId !== client.id) {
    badRequest("An Opportunity already associated with a Client cannot be moved during conversion");
  }
  const stage = input.toPipelineStageId
    ? await stageOrThrow(current.organizationId, input.toPipelineStageId)
    : null;
  const changedByUserId = requireSessionUser(ctx);
  const occurredAt = input.occurredAt ?? new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(opportunities)
      .set({
        clientId: client.id,
        convertedAt: occurredAt,
        ...(stage
          ? {
              pipelineStageId: stage.id,
              closedAt: stage.outcome === "open" ? null : occurredAt,
            }
          : {}),
      })
      .where(eq(opportunities.id, current.id));
    if (stage && stage.id !== current.pipelineStageId) {
      await tx.insert(opportunityStageTransitions).values({
        organizationId: current.organizationId,
        opportunityId: current.id,
        fromPipelineStageId: current.pipelineStageId,
        toPipelineStageId: stage.id,
        changedByUserId,
        occurredAt,
        note: "Opportunity converted to Client",
      });
    }
    await tx.insert(clientAuditEntries).values({
      organizationId: current.organizationId,
      clientId: client.id,
      actorUserId: changedByUserId,
      action: "opportunity.converted",
      entityType: "opportunity",
      entityId: current.id,
      changeSummary: { pipelineStageId: stage?.id ?? current.pipelineStageId },
    });
  });
  return getOpportunity(ctx, { id: current.id });
}

export async function listOpportunityStageTransitions(
  ctx: Context,
  input: ListOpportunityStageTransitionsInput,
) {
  const opportunity = await opportunityOrThrow(input.opportunityId);
  await requirePermission(ctx, "clients:read", opportunity.branchId);
  return db
    .select({ transition: opportunityStageTransitions, toPipelineStage: pipelineStages })
    .from(opportunityStageTransitions)
    .innerJoin(pipelineStages, eq(opportunityStageTransitions.toPipelineStageId, pipelineStages.id))
    .where(eq(opportunityStageTransitions.opportunityId, input.opportunityId))
    .orderBy(asc(opportunityStageTransitions.occurredAt));
}
