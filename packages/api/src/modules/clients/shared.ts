import { and, eq } from "drizzle-orm";

import {
  branches,
  clientTypes,
  clients,
  employees,
  industries,
  organizations,
} from "@UnifiedAttendance/db/schema/index";

import { badRequest, notFound } from "../../errors";

import type { Context } from "../../context";

export async function currentOrganizationOrThrow(ctx: Context) {
  const [organization] = await ctx.db.select().from(organizations).limit(1);
  if (!organization) notFound("Organization");
  return organization;
}

export async function clientOrThrow(ctx: Context, clientId: string) {
  const [client] = await ctx.db.select().from(clients).where(eq(clients.id, clientId)).limit(1);
  if (!client) notFound("Client");
  return client;
}

export async function validateClientReferences(
  ctx: Context,
  input: {
    organizationId: string;
    branchId: string;
    ownerEmployeeId: string;
    industryId: string;
    clientTypeId: string;
  },
) {
  const [[branch], [owner], [industry], [clientType]] = await Promise.all([
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
    ctx.db
      .select({ id: industries.id })
      .from(industries)
      .where(
        and(
          eq(industries.id, input.industryId),
          eq(industries.organizationId, input.organizationId),
          eq(industries.status, "active"),
        ),
      )
      .limit(1),
    ctx.db
      .select({ id: clientTypes.id })
      .from(clientTypes)
      .where(
        and(
          eq(clientTypes.id, input.clientTypeId),
          eq(clientTypes.organizationId, input.organizationId),
          eq(clientTypes.status, "active"),
        ),
      )
      .limit(1),
  ]);

  if (!branch) badRequest("Branch is not available");
  if (!owner) badRequest("Account Owner is not available");
  if (!industry) badRequest("Industry is not active in this Organization");
  if (!clientType) badRequest("Client Type is not active in this Organization");
}

export function localBusinessDate(timeZone: string, instant = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}
