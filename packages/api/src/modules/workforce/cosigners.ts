import { eq } from "drizzle-orm";

import { cosigners, employmentContracts } from "@UnifiedAttendance/db/schema/index";

import { conflict } from "../../errors";
import { requirePermission } from "../shared/guards";

import type {
  CreateCosignerInput,
  ResourceIdInput,
  UpdateCosignerInput,
} from "../../validations/workforce";
import type { Context } from "../../context";

export async function listCosigners(ctx: Context) {
  await requirePermission(ctx, "workforce:read");
  return ctx.db.select().from(cosigners).orderBy(cosigners.fullName);
}

export async function createCosigner(ctx: Context, input: CreateCosignerInput) {
  await requirePermission(ctx, "workforce:manage");
  const [cosigner] = await ctx.db.insert(cosigners).values(input).returning();
  return cosigner;
}

export async function updateCosigner(ctx: Context, input: UpdateCosignerInput) {
  await requirePermission(ctx, "workforce:manage");
  const { id: cosignerId, ...values } = input;
  const [cosigner] = await ctx.db
    .update(cosigners)
    .set(values)
    .where(eq(cosigners.id, cosignerId))
    .returning();
  return cosigner ?? null;
}

export async function deleteCosigner(ctx: Context, input: ResourceIdInput) {
  await requirePermission(ctx, "workforce:manage");
  const [contract] = await ctx.db
    .select({ id: employmentContracts.id })
    .from(employmentContracts)
    .where(eq(employmentContracts.cosignerId, input.id))
    .limit(1);
  if (contract) conflict("Cosigners linked to employment contracts cannot be deleted");
  const [deleted] = await ctx.db.delete(cosigners).where(eq(cosigners.id, input.id)).returning();
  return deleted ?? null;
}
