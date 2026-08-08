import { and, asc, count, eq, ilike, sql } from "drizzle-orm";

import {
  clientAuditEntries,
  clients,
  commercialContracts,
  opportunities,
} from "@UnifiedAttendance/db/schema/index";

import { badRequest, notFound } from "../../errors";
import { withTransaction } from "../../context";
import { requirePermission, requireSessionUser } from "../shared/guards";
import { clientOrThrow, currentOrganizationOrThrow } from "./shared";

import type { Context } from "../../context";
import type {
  ClientResourceIdInput,
  CreateCommercialContractInput,
  ListCommercialContractsInput,
  UpdateCommercialContractInput,
} from "../../validations/clients";

function commercialContractQuery(ctx: Context) {
  return ctx.db
    .select({
      commercialContract: commercialContracts,
      client: clients,
      opportunity: opportunities,
    })
    .from(commercialContracts)
    .innerJoin(clients, eq(commercialContracts.clientId, clients.id))
    .leftJoin(opportunities, eq(commercialContracts.opportunityId, opportunities.id));
}

async function commercialContractOrThrow(ctx: Context, contractId: string) {
  const [contract] = await ctx.db
    .select()
    .from(commercialContracts)
    .where(eq(commercialContracts.id, contractId))
    .limit(1);
  if (!contract) notFound("Commercial Contract");
  return contract;
}

async function validateOpportunityOrigin(
  ctx: Context,
  organizationId: string,
  clientId: string,
  opportunityId?: string | null,
) {
  if (!opportunityId) return;
  const [opportunity] = await ctx.db
    .select({ clientId: opportunities.clientId })
    .from(opportunities)
    .where(
      and(eq(opportunities.id, opportunityId), eq(opportunities.organizationId, organizationId)),
    )
    .limit(1);
  if (!opportunity || opportunity.clientId !== clientId) {
    badRequest("Opportunity must belong to the Commercial Contract Client");
  }
}

function validateCommercialContract(input: {
  startsOn: string;
  endsOn: string;
  status: "draft" | "active" | "expired" | "terminated" | "cancelled";
  signedOn: string | null;
  amount: string | null;
  currency: string | null;
}) {
  if (input.endsOn <= input.startsOn) {
    badRequest("Commercial Contract end date must be after its start date");
  }
  if (input.status !== "draft" && input.status !== "cancelled" && !input.signedOn) {
    badRequest("A signed date is required before a Commercial Contract becomes active");
  }
  if ((input.amount === null) !== (input.currency === null)) {
    badRequest("Commercial Contract amount and currency must be provided or cleared together");
  }
}

export async function getCommercialContract(ctx: Context, input: ClientResourceIdInput) {
  const contract = await commercialContractOrThrow(ctx, input.id);
  const client = await clientOrThrow(ctx, contract.clientId);
  await requirePermission(ctx, "clients:read", client.branchId);
  const [row] = await commercialContractQuery(ctx)
    .where(eq(commercialContracts.id, input.id))
    .limit(1);
  if (!row) throw new Error("Commercial Contract details could not be loaded");
  return row;
}

export async function listCommercialContracts(ctx: Context, input: ListCommercialContractsInput) {
  await requirePermission(ctx, "clients:read");
  const organization = await currentOrganizationOrThrow(ctx);
  const filters = [eq(commercialContracts.organizationId, organization.id)];
  if (input.clientId) filters.push(eq(commercialContracts.clientId, input.clientId));
  if (input.opportunityId) filters.push(eq(commercialContracts.opportunityId, input.opportunityId));
  if (input.status) filters.push(eq(commercialContracts.status, input.status));
  return commercialContractQuery(ctx)
    .where(and(...filters))
    .orderBy(asc(commercialContracts.startsOn));
}

export async function createCommercialContract(ctx: Context, input: CreateCommercialContractInput) {
  const client = await clientOrThrow(ctx, input.clientId);
  await requirePermission(ctx, "clients:manage", client.branchId);
  const organization = await currentOrganizationOrThrow(ctx);
  if (client.organizationId !== organization.id)
    badRequest("Client belongs to another Organization");
  await validateOpportunityOrigin(ctx, organization.id, client.id, input.opportunityId);
  const status = input.status ?? "draft";
  const signedOn = input.signedOn ?? null;
  const amount = input.amount ?? null;
  const currency = input.currency ?? null;
  validateCommercialContract({
    startsOn: input.startsOn,
    endsOn: input.endsOn,
    status,
    signedOn,
    amount,
    currency,
  });
  const actorUserId = requireSessionUser(ctx);
  const contractId = await withTransaction(ctx, async (ctx) => {
    await ctx.db.execute(sql`select pg_advisory_xact_lock(hashtext(${organization.id}))`);
    const year = input.startsOn.slice(0, 4);
    const [row] = await ctx.db
      .select({ value: count() })
      .from(commercialContracts)
      .where(
        and(
          eq(commercialContracts.organizationId, organization.id),
          ilike(commercialContracts.contractCode, `CTR-${year}-%`),
        ),
      );
    const contractCode = `CTR-${year}-${String((row?.value ?? 0) + 1).padStart(6, "0")}`;
    const [contract] = await ctx.db
      .insert(commercialContracts)
      .values({
        organizationId: organization.id,
        clientId: client.id,
        opportunityId: input.opportunityId ?? null,
        contractCode,
        serviceName: input.serviceName,
        billingCadence: input.billingCadence ?? null,
        startsOn: input.startsOn,
        endsOn: input.endsOn,
        renewalMode: input.renewalMode ?? "none",
        status,
        signedOn,
        amount,
        currency,
        paymentStructure: input.paymentStructure ?? "full",
      })
      .returning({ id: commercialContracts.id });
    if (!contract) throw new Error("Commercial Contract creation failed");
    await ctx.db.insert(clientAuditEntries).values({
      organizationId: organization.id,
      clientId: client.id,
      actorUserId,
      action: status === "active" ? "commercial_contract.signed" : "commercial_contract.created",
      entityType: "commercial_contract",
      entityId: contract.id,
      changeSummary: { contractCode, status },
    });
    return contract.id;
  });
  return getCommercialContract(ctx, { id: contractId });
}

export async function updateCommercialContract(ctx: Context, input: UpdateCommercialContractInput) {
  const current = await commercialContractOrThrow(ctx, input.id);
  const client = await clientOrThrow(ctx, current.clientId);
  await requirePermission(ctx, "clients:manage", client.branchId);
  const startsOn = input.startsOn ?? current.startsOn;
  const endsOn = input.endsOn ?? current.endsOn;
  const status = input.status ?? current.status;
  const signedOn = input.signedOn === undefined ? current.signedOn : input.signedOn;
  const amount = input.amount === undefined ? current.amount : input.amount;
  const currency = input.currency === undefined ? current.currency : input.currency;
  const opportunityId =
    input.opportunityId === undefined ? current.opportunityId : input.opportunityId;
  await validateOpportunityOrigin(ctx, current.organizationId, current.clientId, opportunityId);
  validateCommercialContract({ startsOn, endsOn, status, signedOn, amount, currency });
  const actorUserId = requireSessionUser(ctx);
  const { id: contractId, ...values } = input;
  await withTransaction(ctx, async (ctx) => {
    await ctx.db
      .update(commercialContracts)
      .set({ ...values, startsOn, endsOn, status, signedOn, amount, currency })
      .where(eq(commercialContracts.id, contractId));
    await ctx.db.insert(clientAuditEntries).values({
      organizationId: current.organizationId,
      clientId: current.clientId,
      actorUserId,
      action:
        status === "active" && current.status !== "active"
          ? "commercial_contract.signed"
          : "commercial_contract.updated",
      entityType: "commercial_contract",
      entityId: contractId,
      changeSummary: { changedFields: Object.keys(values) },
    });
  });
  return getCommercialContract(ctx, { id: contractId });
}
