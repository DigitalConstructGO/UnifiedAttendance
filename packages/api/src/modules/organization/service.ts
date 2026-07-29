import { and, eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import { branchWorkingDays, branches, holidays, organizations } from "@UnifiedAttendance/db/schema/index";

import { conflict, notFound } from "../../errors";
import { requirePermission, requireSuperAdmin } from "../shared/guards";

import type {
  BranchIdInput,
  CreateBranchInput,
  CreateHolidayInput,
  CreateOrganizationInput,
  HolidayIdInput,
  ListHolidaysInput,
  ReplaceWorkingDaysInput,
  UpdateBranchInput,
  UpdateHolidayInput,
  UpdateOrganizationInput,
  WorkingDaysInput,
} from "../../validations/organization";
import type { Context } from "../../context";

export async function getOrganization(ctx: Context) {
  await requirePermission(ctx, "organization:read");
  const [organization] = await db.select().from(organizations).limit(1);
  return organization ?? null;
}

export async function createOrganization(ctx: Context, input: CreateOrganizationInput) {
  await requireSuperAdmin(ctx);
  const existing = await db.select({ id: organizations.id }).from(organizations).limit(1);
  if (existing.length > 0) conflict("An organization already exists");
  const [organization] = await db.insert(organizations).values(input).returning();
  return organization;
}

export async function updateOrganization(ctx: Context, input: UpdateOrganizationInput) {
  await requirePermission(ctx, "organization:manage");
  const { id: organizationId, ...values } = input;
  const [organization] = await db.update(organizations).set(values).where(eq(organizations.id, organizationId)).returning();
  return organization ?? null;
}

export async function listBranches(ctx: Context) {
  await requirePermission(ctx, "organization:read");
  return db.select().from(branches).orderBy(branches.name);
}

export async function getBranch(ctx: Context, input: BranchIdInput) {
  const [branch] = await db.select().from(branches).where(eq(branches.id, input.branchId)).limit(1);
  if (!branch) notFound("Branch");
  await requirePermission(ctx, "organization:read", branch.id);
  return branch;
}

export async function createBranch(ctx: Context, input: CreateBranchInput) {
  await requirePermission(ctx, "organization:manage");
  const [branch] = await db.insert(branches).values(input).returning();
  return branch;
}

export async function updateBranch(ctx: Context, input: UpdateBranchInput) {
  const [existing] = await db.select({ id: branches.id }).from(branches).where(eq(branches.id, input.branchId)).limit(1);
  if (!existing) notFound("Branch");
  await requirePermission(ctx, "organization:manage", existing.id);
  const { branchId, ...values } = input;
  const [branch] = await db.update(branches).set(values).where(eq(branches.id, branchId)).returning();
  return branch;
}

export async function listWorkingDays(ctx: Context, input: WorkingDaysInput) {
  await requirePermission(ctx, "organization:read", input.branchId);
  return db.select().from(branchWorkingDays).where(eq(branchWorkingDays.branchId, input.branchId)).orderBy(branchWorkingDays.weekday);
}

export async function replaceWorkingDays(
  ctx: Context,
  input: ReplaceWorkingDaysInput,
) {
  await requirePermission(ctx, "organization:manage", input.branchId);
  return db.transaction(async (tx) => {
    await tx.delete(branchWorkingDays).where(eq(branchWorkingDays.branchId, input.branchId));
    return tx.insert(branchWorkingDays).values(input.days.map((day) => ({ ...day, branchId: input.branchId }))).returning();
  });
}

export async function listHolidays(ctx: Context, input: ListHolidaysInput) {
  await requirePermission(ctx, "organization:read", input.branchId ?? undefined);
  return input.branchId
    ? db.select().from(holidays).where(eq(holidays.branchId, input.branchId)).orderBy(holidays.holidayDate)
    : db.select().from(holidays).orderBy(holidays.holidayDate);
}

export async function createHoliday(ctx: Context, input: CreateHolidayInput) {
  await requirePermission(ctx, "organization:manage", input.branchId ?? undefined);
  const [holiday] = await db.insert(holidays).values({ ...input, branchId: input.branchId ?? null }).returning();
  return holiday;
}

export async function updateHoliday(ctx: Context, input: UpdateHolidayInput) {
  const [existing] = await db.select().from(holidays).where(eq(holidays.id, input.id)).limit(1);
  if (!existing) notFound("Holiday");
  await requirePermission(ctx, "organization:manage", existing.branchId ?? undefined);
  const { id: holidayId, ...values } = input;
  const [holiday] = await db.update(holidays).set(values).where(eq(holidays.id, holidayId)).returning();
  return holiday;
}

export async function deleteHoliday(ctx: Context, input: HolidayIdInput) {
  const [existing] = await db.select().from(holidays).where(eq(holidays.id, input.id)).limit(1);
  if (!existing) notFound("Holiday");
  await requirePermission(ctx, "organization:manage", existing.branchId ?? undefined);
  const [holiday] = await db.delete(holidays).where(and(eq(holidays.id, input.id))).returning();
  return holiday;
}
