import { eq } from "drizzle-orm";

import { departments } from "@UnifiedAttendance/db/schema/index";

import { notFound } from "../../errors";
import { requirePermission } from "../shared/guards";

import type {
  CreateDepartmentInput,
  ResourceIdInput,
  UpdateDepartmentInput,
} from "../../validations/workforce";
import type { Context } from "../../context";

export async function listDepartments(ctx: Context) {
  await requirePermission(ctx, "departments.read");
  return ctx.db.select().from(departments).orderBy(departments.name);
}

export async function createDepartment(ctx: Context, input: CreateDepartmentInput) {
  await requirePermission(ctx, "departments.create", input.branchId ?? undefined);
  const [department] = await ctx.db
    .insert(departments)
    .values({ ...input, branchId: input.branchId ?? null })
    .returning();
  return department;
}

export async function updateDepartment(ctx: Context, input: UpdateDepartmentInput) {
  const [existing] = await ctx.db
    .select()
    .from(departments)
    .where(eq(departments.id, input.id))
    .limit(1);
  if (!existing) notFound("Department");
  await requirePermission(ctx, "departments.update", existing.branchId ?? undefined);
  if (input.branchId && input.branchId !== existing.branchId)
    await requirePermission(ctx, "departments.update", input.branchId);
  const { id: departmentId, ...values } = input;
  const [department] = await ctx.db
    .update(departments)
    .set(values)
    .where(eq(departments.id, departmentId))
    .returning();
  return department;
}

export async function deleteDepartment(ctx: Context, input: ResourceIdInput) {
  const [department] = await ctx.db
    .select()
    .from(departments)
    .where(eq(departments.id, input.id))
    .limit(1);
  if (!department) notFound("Department");
  await requirePermission(ctx, "departments.delete", department.branchId ?? undefined);
  const [deleted] = await ctx.db
    .delete(departments)
    .where(eq(departments.id, input.id))
    .returning();
  return deleted;
}
