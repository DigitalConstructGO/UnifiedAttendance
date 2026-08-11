import { and, asc, eq, ne, sql } from "drizzle-orm";

import { clientTypes, industries, pipelineStages } from "@UnifiedAttendance/db/schema/index";

import { conflict, notFound } from "../../errors";
import { requirePermission } from "../shared/guards";
import { currentOrganizationOrThrow } from "./shared";

import type { Context } from "../../context";
import type {
  CreateClientTypeInput,
  CreateIndustryInput,
  CreatePipelineStageInput,
  UpdateCatalogInput,
  UpdatePipelineStageInput,
} from "../../validations/clients";

export async function listIndustries(ctx: Context) {
  await requirePermission(ctx, "clients.read");
  const organization = await currentOrganizationOrThrow(ctx);
  return ctx.db
    .select()
    .from(industries)
    .where(eq(industries.organizationId, organization.id))
    .orderBy(asc(industries.name));
}

export async function createIndustry(ctx: Context, input: CreateIndustryInput) {
  await requirePermission(ctx, "client_catalogs.manage");
  const organization = await currentOrganizationOrThrow(ctx);
  const [existing] = await ctx.db
    .select({ id: industries.id })
    .from(industries)
    .where(and(eq(industries.organizationId, organization.id), eq(industries.name, input.name)))
    .limit(1);
  if (existing) conflict("Industry name already exists");
  const [industry] = await ctx.db
    .insert(industries)
    .values({ organizationId: organization.id, name: input.name })
    .returning();
  if (!industry) throw new Error("Industry creation failed");
  return industry;
}

export async function updateIndustry(ctx: Context, input: UpdateCatalogInput) {
  await requirePermission(ctx, "client_catalogs.manage");
  const organization = await currentOrganizationOrThrow(ctx);
  const [current] = await ctx.db
    .select()
    .from(industries)
    .where(and(eq(industries.id, input.id), eq(industries.organizationId, organization.id)))
    .limit(1);
  if (!current) notFound("Industry");
  if (input.name && input.name !== current.name) {
    const [duplicate] = await ctx.db
      .select({ id: industries.id })
      .from(industries)
      .where(
        and(
          eq(industries.organizationId, organization.id),
          eq(industries.name, input.name),
          ne(industries.id, input.id),
        ),
      )
      .limit(1);
    if (duplicate) conflict("Industry name already exists");
  }
  const { id: industryId, ...values } = input;
  const [industry] = await ctx.db
    .update(industries)
    .set(values)
    .where(eq(industries.id, industryId))
    .returning();
  return industry!;
}

export async function listClientTypes(ctx: Context) {
  await requirePermission(ctx, "clients.read");
  const organization = await currentOrganizationOrThrow(ctx);
  return ctx.db
    .select()
    .from(clientTypes)
    .where(eq(clientTypes.organizationId, organization.id))
    .orderBy(asc(clientTypes.name));
}

export async function createClientType(ctx: Context, input: CreateClientTypeInput) {
  await requirePermission(ctx, "client_catalogs.manage");
  const organization = await currentOrganizationOrThrow(ctx);
  const [existing] = await ctx.db
    .select({ id: clientTypes.id })
    .from(clientTypes)
    .where(and(eq(clientTypes.organizationId, organization.id), eq(clientTypes.name, input.name)))
    .limit(1);
  if (existing) conflict("Client Type name already exists");
  const [clientType] = await ctx.db
    .insert(clientTypes)
    .values({ organizationId: organization.id, name: input.name })
    .returning();
  if (!clientType) throw new Error("Client Type creation failed");
  return clientType;
}

export async function updateClientType(ctx: Context, input: UpdateCatalogInput) {
  await requirePermission(ctx, "client_catalogs.manage");
  const organization = await currentOrganizationOrThrow(ctx);
  const [current] = await ctx.db
    .select()
    .from(clientTypes)
    .where(and(eq(clientTypes.id, input.id), eq(clientTypes.organizationId, organization.id)))
    .limit(1);
  if (!current) notFound("Client Type");
  if (input.name && input.name !== current.name) {
    const [duplicate] = await ctx.db
      .select({ id: clientTypes.id })
      .from(clientTypes)
      .where(
        and(
          eq(clientTypes.organizationId, organization.id),
          eq(clientTypes.name, input.name),
          ne(clientTypes.id, input.id),
        ),
      )
      .limit(1);
    if (duplicate) conflict("Client Type name already exists");
  }
  const { id: clientTypeId, ...values } = input;
  const [clientType] = await ctx.db
    .update(clientTypes)
    .set(values)
    .where(eq(clientTypes.id, clientTypeId))
    .returning();
  return clientType!;
}

export async function listPipelineStages(ctx: Context) {
  await requirePermission(ctx, "clients.read");
  const organization = await currentOrganizationOrThrow(ctx);
  return ctx.db
    .select()
    .from(pipelineStages)
    .where(eq(pipelineStages.organizationId, organization.id))
    .orderBy(asc(pipelineStages.position));
}

export async function createPipelineStage(ctx: Context, input: CreatePipelineStageInput) {
  await requirePermission(ctx, "client_catalogs.manage");
  const organization = await currentOrganizationOrThrow(ctx);
  const [existing] = await ctx.db
    .select({ id: pipelineStages.id })
    .from(pipelineStages)
    .where(
      and(
        eq(pipelineStages.organizationId, organization.id),
        orStageIdentity(input.name, input.position),
      ),
    )
    .limit(1);
  if (existing) conflict("Pipeline Stage name or position already exists");
  const [stage] = await ctx.db
    .insert(pipelineStages)
    .values({ organizationId: organization.id, ...input })
    .returning();
  if (!stage) throw new Error("Pipeline Stage creation failed");
  return stage;
}

export async function updatePipelineStage(ctx: Context, input: UpdatePipelineStageInput) {
  await requirePermission(ctx, "client_catalogs.manage");
  const organization = await currentOrganizationOrThrow(ctx);
  const [current] = await ctx.db
    .select()
    .from(pipelineStages)
    .where(and(eq(pipelineStages.id, input.id), eq(pipelineStages.organizationId, organization.id)))
    .limit(1);
  if (!current) notFound("Pipeline Stage");
  const name = input.name ?? current.name;
  const position = input.position ?? current.position;
  const [duplicate] = await ctx.db
    .select({ id: pipelineStages.id })
    .from(pipelineStages)
    .where(
      and(
        eq(pipelineStages.organizationId, organization.id),
        orStageIdentity(name, position),
        ne(pipelineStages.id, input.id),
      ),
    )
    .limit(1);
  if (duplicate) conflict("Pipeline Stage name or position already exists");
  const { id: stageId, ...values } = input;
  const [stage] = await ctx.db
    .update(pipelineStages)
    .set(values)
    .where(eq(pipelineStages.id, stageId))
    .returning();
  return stage!;
}

function orStageIdentity(name: string, position: number) {
  return sql`${pipelineStages.name} = ${name} or ${pipelineStages.position} = ${position}`;
}
