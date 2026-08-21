import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";

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
import { withTransaction } from "../../context";
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

function opportunityQuery(ctx: Context) {
  return ctx.db
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

async function opportunityOrThrow(ctx: Context, opportunityId: string) {
  const [opportunity] = await ctx.db
    .select()
    .from(opportunities)
    .where(eq(opportunities.id, opportunityId))
    .limit(1);
  if (!opportunity) notFound("Opportunity");
  return opportunity;
}

async function stageOrThrow(ctx: Context, organizationId: string, stageId: string) {
  const [stage] = await ctx.db
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
  ctx: Context,
  organizationId: string,
  input: Pick<CreateOpportunityInput, "branchId" | "ownerEmployeeId"> & {
    industryId?: string | null;
    clientId?: string | null;
  },
) {
  const [[branch], [owner]] = await Promise.all([
    ctx.db
      .select({ id: branches.id })
      .from(branches)
      .where(eq(branches.id, input.branchId))
      .limit(1),
    ctx.db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.id, input.ownerEmployeeId))
      .limit(1),
  ]);
  if (!branch) badRequest("Branch is not available");
  if (!owner) badRequest("Opportunity Owner is not available");
  if (input.industryId) {
    const [industry] = await ctx.db
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
    const client = await clientOrThrow(ctx, input.clientId);
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
  const opportunity = await opportunityOrThrow(ctx, input.id);
  await requirePermission(ctx, "clients.read", opportunity.branchId);
  const [row] = await opportunityQuery(ctx).where(eq(opportunities.id, input.id)).limit(1);
  if (!row) throw new Error("Opportunity details could not be loaded");
  return shapeOpportunity(row);
}

export async function listOpportunities(ctx: Context, input: ListOpportunitiesInput) {
  await requirePermission(ctx, "clients.read", input.branchId);
  const organization = await currentOrganizationOrThrow(ctx);
  const filters = [eq(opportunities.organizationId, organization.id)];
  if (input.branchId) filters.push(eq(opportunities.branchId, input.branchId));
  if (input.clientId) filters.push(eq(opportunities.clientId, input.clientId));
  if (input.ownerEmployeeId) filters.push(eq(opportunities.ownerEmployeeId, input.ownerEmployeeId));
  if (input.pipelineStageId) filters.push(eq(opportunities.pipelineStageId, input.pipelineStageId));
  if (!input.includeClosed) filters.push(isNull(opportunities.closedAt));
  filters.push(
    input.archived ? isNotNull(opportunities.archivedAt) : isNull(opportunities.archivedAt),
  );
  const rows = await opportunityQuery(ctx)
    .where(and(...filters))
    .orderBy(asc(pipelineStages.position), asc(opportunities.createdAt));
  return rows.map(shapeOpportunity);
}

export async function createOpportunity(ctx: Context, input: CreateOpportunityInput) {
  await requirePermission(ctx, "opportunities.create", input.branchId);
  const organization = await currentOrganizationOrThrow(ctx);
  await validateOpportunityReferences(ctx, organization.id, input);
  await stageOrThrow(ctx, organization.id, input.pipelineStageId);
  validateValueCurrency(input.estimatedValue, input.currency);
  const changedByUserId = requireSessionUser(ctx);
  const occurredAt = new Date();
  const opportunityId = await withTransaction(ctx, async (ctx) => {
    const [opportunity] = await ctx.db
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
    await ctx.db.insert(opportunityStageTransitions).values({
      organizationId: organization.id,
      opportunityId: opportunity.id,
      fromPipelineStageId: null,
      toPipelineStageId: input.pipelineStageId,
      changedByUserId,
      occurredAt,
    });
    if (input.clientId) {
      await ctx.db.insert(clientAuditEntries).values({
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
  const current = await opportunityOrThrow(ctx, input.id);
  await requirePermission(ctx, "opportunities.update", current.branchId);
  if (input.branchId && input.branchId !== current.branchId) {
    await requirePermission(ctx, "opportunities.update", input.branchId);
  }
  const branchId = input.branchId ?? current.branchId;
  const ownerEmployeeId = input.ownerEmployeeId ?? current.ownerEmployeeId;
  const industryId = input.industryId === undefined ? current.industryId : input.industryId;
  const estimatedValue =
    input.estimatedValue === undefined ? current.estimatedValue : input.estimatedValue;
  const currency = input.currency === undefined ? current.currency : input.currency;
  await validateOpportunityReferences(ctx, current.organizationId, {
    branchId,
    ownerEmployeeId,
    industryId,
    clientId: current.clientId,
  });
  validateValueCurrency(estimatedValue, currency);
  const actorUserId = requireSessionUser(ctx);
  const { id: opportunityId, ...values } = input;
  await withTransaction(ctx, async (ctx) => {
    await ctx.db.update(opportunities).set(values).where(eq(opportunities.id, opportunityId));
    if (current.clientId) {
      await ctx.db.insert(clientAuditEntries).values({
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
  const current = await opportunityOrThrow(ctx, input.id);
  await requirePermission(ctx, "opportunities.move_stage", current.branchId);
  if (current.archivedAt) conflict("This Lead is archived — restore it before moving it");
  if (current.pipelineStageId === input.toPipelineStageId) {
    badRequest("Opportunity is already in that Pipeline Stage");
  }
  const stage = await stageOrThrow(ctx, current.organizationId, input.toPipelineStageId);
  const changedByUserId = requireSessionUser(ctx);
  const occurredAt = input.occurredAt ?? new Date();
  await withTransaction(ctx, async (ctx) => {
    await ctx.db
      .update(opportunities)
      .set({
        pipelineStageId: stage.id,
        closedAt: stage.outcome === "open" ? null : occurredAt,
      })
      .where(eq(opportunities.id, current.id));
    await ctx.db.insert(opportunityStageTransitions).values({
      organizationId: current.organizationId,
      opportunityId: current.id,
      fromPipelineStageId: current.pipelineStageId,
      toPipelineStageId: stage.id,
      changedByUserId,
      occurredAt,
      note: input.note ?? null,
    });
    if (current.clientId) {
      await ctx.db.insert(clientAuditEntries).values({
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
  const current = await opportunityOrThrow(ctx, input.id);
  await requirePermission(ctx, "opportunities.convert", current.branchId);
  if (current.archivedAt) conflict("This Lead is archived — restore it before converting it");
  if (current.convertedAt) conflict("Opportunity has already been converted");
  const client = await clientOrThrow(ctx, input.clientId);
  await requirePermission(ctx, "opportunities.convert", client.branchId);
  if (client.organizationId !== current.organizationId) {
    badRequest("Opportunity and Client belong to different Organizations");
  }
  if (current.clientId && current.clientId !== client.id) {
    badRequest("An Opportunity already associated with a Client cannot be moved during conversion");
  }
  const stage = input.toPipelineStageId
    ? await stageOrThrow(ctx, current.organizationId, input.toPipelineStageId)
    : null;
  const changedByUserId = requireSessionUser(ctx);
  const occurredAt = input.occurredAt ?? new Date();
  await withTransaction(ctx, async (ctx) => {
    await ctx.db
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
      await ctx.db.insert(opportunityStageTransitions).values({
        organizationId: current.organizationId,
        opportunityId: current.id,
        fromPipelineStageId: current.pipelineStageId,
        toPipelineStageId: stage.id,
        changedByUserId,
        occurredAt,
        note: "Opportunity converted to Client",
      });
    }
    await ctx.db.insert(clientAuditEntries).values({
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

export async function archiveOpportunity(ctx: Context, input: ClientResourceIdInput) {
  const current = await opportunityOrThrow(ctx, input.id);
  await requirePermission(ctx, "opportunities.archive", current.branchId);
  if (current.archivedAt) return getOpportunity(ctx, { id: current.id });
  const actorUserId = requireSessionUser(ctx);
  await withTransaction(ctx, async (ctx) => {
    await ctx.db
      .update(opportunities)
      .set({ archivedAt: new Date() })
      .where(eq(opportunities.id, current.id));
    if (current.clientId) {
      await ctx.db.insert(clientAuditEntries).values({
        organizationId: current.organizationId,
        clientId: current.clientId,
        actorUserId,
        action: "opportunity.archived",
        entityType: "opportunity",
        entityId: current.id,
      });
    }
  });
  return getOpportunity(ctx, { id: current.id });
}

export async function restoreOpportunity(ctx: Context, input: ClientResourceIdInput) {
  const current = await opportunityOrThrow(ctx, input.id);
  await requirePermission(ctx, "opportunities.restore", current.branchId);
  if (!current.archivedAt) return getOpportunity(ctx, { id: current.id });
  const actorUserId = requireSessionUser(ctx);
  await withTransaction(ctx, async (ctx) => {
    await ctx.db
      .update(opportunities)
      .set({ archivedAt: null })
      .where(eq(opportunities.id, current.id));
    if (current.clientId) {
      await ctx.db.insert(clientAuditEntries).values({
        organizationId: current.organizationId,
        clientId: current.clientId,
        actorUserId,
        action: "opportunity.restored",
        entityType: "opportunity",
        entityId: current.id,
      });
    }
  });
  return getOpportunity(ctx, { id: current.id });
}

export async function deleteOpportunity(ctx: Context, input: ClientResourceIdInput) {
  const current = await opportunityOrThrow(ctx, input.id);
  await requirePermission(ctx, "opportunities.delete", current.branchId);
  if (!current.archivedAt) {
    badRequest("Archive this Lead first — deletion is only allowed from the archive");
  }
  if (current.convertedAt) {
    conflict("A converted Lead cannot be deleted — it is part of the Client's history");
  }
  const actorUserId = requireSessionUser(ctx);
  await withTransaction(ctx, async (ctx) => {
    await ctx.db
      .delete(opportunityStageTransitions)
      .where(eq(opportunityStageTransitions.opportunityId, current.id));
    await ctx.db.delete(opportunities).where(eq(opportunities.id, current.id));
    if (current.clientId) {
      await ctx.db.insert(clientAuditEntries).values({
        organizationId: current.organizationId,
        clientId: current.clientId,
        actorUserId,
        action: "opportunity.deleted",
        entityType: "opportunity",
        entityId: current.id,
        changeSummary: { name: current.name },
      });
    }
  });
  return current;
}

export async function listOpportunityStageTransitions(
  ctx: Context,
  input: ListOpportunityStageTransitionsInput,
) {
  const opportunity = await opportunityOrThrow(ctx, input.opportunityId);
  await requirePermission(ctx, "clients.read", opportunity.branchId);
  return ctx.db
    .select({ transition: opportunityStageTransitions, toPipelineStage: pipelineStages })
    .from(opportunityStageTransitions)
    .innerJoin(pipelineStages, eq(opportunityStageTransitions.toPipelineStageId, pipelineStages.id))
    .where(eq(opportunityStageTransitions.opportunityId, input.opportunityId))
    .orderBy(asc(opportunityStageTransitions.occurredAt));
}
