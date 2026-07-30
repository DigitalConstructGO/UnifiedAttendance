import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import { positions } from "@UnifiedAttendance/db/schema/index";

import { requirePermission } from "../shared/guards";

import type {
  CreatePositionInput,
  ResourceIdInput,
  UpdatePositionInput,
} from "../../validations/workforce";
import type { Context } from "../../context";

export async function listPositions(ctx: Context) {
  await requirePermission(ctx, "workforce:read");
  return db.select().from(positions).orderBy(positions.title);
}

export async function createPosition(ctx: Context, input: CreatePositionInput) {
  await requirePermission(ctx, "workforce:manage");
  const [position] = await db.insert(positions).values(input).returning();
  return position;
}

export async function updatePosition(ctx: Context, input: UpdatePositionInput) {
  await requirePermission(ctx, "workforce:manage");
  const { id: positionId, ...values } = input;
  const [position] = await db
    .update(positions)
    .set(values)
    .where(eq(positions.id, positionId))
    .returning();
  return position ?? null;
}

export async function deletePosition(ctx: Context, input: ResourceIdInput) {
  await requirePermission(ctx, "workforce:manage");
  const [deleted] = await db.delete(positions).where(eq(positions.id, input.id)).returning();
  return deleted ?? null;
}
