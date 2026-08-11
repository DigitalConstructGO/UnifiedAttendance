import { and, eq, sql } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import {
  branchWorkingDays,
  branches,
  holidays,
  organizations,
} from "@UnifiedAttendance/db/schema/index";

import { conflict, notFound } from "../../errors";
import { withTransaction } from "../../context";
import { requireAdministrator, requirePermission, requireSuperAdmin } from "../shared/guards";

import type {
  BranchIdInput,
  CreateBranchInput,
  CreateHolidayInput,
  CreateOrganizationInput,
  BootstrapOrganizationInput,
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
  await requirePermission(ctx, "organization.read");
  const [organization] = await ctx.db.select().from(organizations).limit(1);
  return organization ?? null;
}

/**
 * The identity printed on documents such as invoices. Any signed-in user may
 * read it — the letterhead is on every page's sidebar already, and a clients
 * user without organization:read still has to print an invoice.
 */
export async function getOrganizationLetterhead(ctx: Context) {
  const [organization] = await ctx.db
    .select({
      name: organizations.name,
      logoUrl: organizations.logoUrl,
      tin: organizations.tin,
      address: organizations.address,
    })
    .from(organizations)
    .limit(1);
  return organization ?? null;
}

export async function getSetupStatus(ctx: Pick<Context, "db"> = { db }) {
  const result = await ctx.db.execute(sql`
    select
      exists (select 1 from ${organizations}) as organization_exists,
      exists (select 1 from ${branches}) as branch_exists,
      (
        select count(distinct ${branchWorkingDays.weekday}) = 7
        from ${branchWorkingDays}
        where ${branchWorkingDays.branchId} =
          (select ${branches.id} from ${branches} order by ${branches.createdAt} limit 1)
      ) as schedule_complete
  `);

  const row = result.rows[0] as {
    organization_exists: boolean;
    branch_exists: boolean;
    schedule_complete: boolean;
  };
  const organizationExists = Boolean(row.organization_exists);
  const branchExists = Boolean(row.branch_exists);
  const scheduleComplete = Boolean(row.schedule_complete);

  return {
    complete: organizationExists && branchExists && scheduleComplete,
    organizationExists,
    branchExists,
    scheduleComplete,
  };
}

export async function createOrganization(ctx: Context, input: CreateOrganizationInput) {
  await requireSuperAdmin(ctx);
  const existing = await ctx.db.select({ id: organizations.id }).from(organizations).limit(1);
  if (existing.length > 0) conflict("An organization already exists");
  const [organization] = await ctx.db.insert(organizations).values(input).returning();
  return organization;
}

export async function bootstrapOrganization(ctx: Context, input: BootstrapOrganizationInput) {
  await requireAdministrator(ctx);
  return withTransaction(ctx, async (ctx) => {
    await ctx.db.execute(sql`select pg_advisory_xact_lock(847291)`);
    const [existing] = await ctx.db.select({ id: organizations.id }).from(organizations).limit(1);
    if (existing) conflict("An organization already exists");
    const [organization] = await ctx.db
      .insert(organizations)
      .values({
        name: input.organization.name,
        code: input.organization.code,
        timezone: input.timezone,
        logoUrl: null,
      })
      .returning();
    const [branch] = await ctx.db
      .insert(branches)
      .values({
        name: input.branch.name,
        code: input.branch.code,
        address: input.branch.address,
        timezone: input.timezone,
      })
      .returning();
    if (!organization || !branch)
      throw new Error("Bootstrap could not create the organization and branch");
    const days = await ctx.db
      .insert(branchWorkingDays)
      .values(input.days.map((day) => ({ ...day, branchId: branch.id })))
      .returning();
    return { organization, branch, days };
  });
}

export async function updateOrganization(ctx: Context, input: UpdateOrganizationInput) {
  await requirePermission(ctx, "organization.update");
  const { id: organizationId, ...values } = input;
  const [organization] = await ctx.db
    .update(organizations)
    .set(values)
    .where(eq(organizations.id, organizationId))
    .returning();
  return organization ?? null;
}

export async function listBranches(ctx: Context) {
  await requirePermission(ctx, "branches.read");
  return ctx.db.select().from(branches).orderBy(branches.name);
}

export async function getBranch(ctx: Context, input: BranchIdInput) {
  const [branch] = await ctx.db
    .select()
    .from(branches)
    .where(eq(branches.id, input.branchId))
    .limit(1);
  if (!branch) notFound("Branch");
  await requirePermission(ctx, "branches.read", branch.id);
  return branch;
}

export async function createBranch(ctx: Context, input: CreateBranchInput) {
  await requirePermission(ctx, "branches.create");
  const [branch] = await ctx.db.insert(branches).values(input).returning();
  return branch;
}

export async function updateBranch(ctx: Context, input: UpdateBranchInput) {
  const [existing] = await ctx.db
    .select({ id: branches.id })
    .from(branches)
    .where(eq(branches.id, input.branchId))
    .limit(1);
  if (!existing) notFound("Branch");
  await requirePermission(ctx, "branches.update", existing.id);
  const { branchId, ...values } = input;
  const [branch] = await ctx.db
    .update(branches)
    .set(values)
    .where(eq(branches.id, branchId))
    .returning();
  return branch;
}

export async function listWorkingDays(ctx: Context, input: WorkingDaysInput) {
  await requirePermission(ctx, "branches.read", input.branchId);
  return ctx.db
    .select()
    .from(branchWorkingDays)
    .where(eq(branchWorkingDays.branchId, input.branchId))
    .orderBy(branchWorkingDays.weekday);
}

export async function replaceWorkingDays(ctx: Context, input: ReplaceWorkingDaysInput) {
  await requirePermission(ctx, "branches.manage_schedule", input.branchId);
  return withTransaction(ctx, async (ctx) => {
    await ctx.db.delete(branchWorkingDays).where(eq(branchWorkingDays.branchId, input.branchId));
    return ctx.db
      .insert(branchWorkingDays)
      .values(input.days.map((day) => ({ ...day, branchId: input.branchId })))
      .returning();
  });
}

export async function listHolidays(ctx: Context, input: ListHolidaysInput) {
  await requirePermission(ctx, "holidays.read", input.branchId ?? undefined);
  return input.branchId
    ? ctx.db
        .select()
        .from(holidays)
        .where(eq(holidays.branchId, input.branchId))
        .orderBy(holidays.holidayDate)
    : ctx.db.select().from(holidays).orderBy(holidays.holidayDate);
}

export async function createHoliday(ctx: Context, input: CreateHolidayInput) {
  await requirePermission(ctx, "holidays.create", input.branchId ?? undefined);
  const [holiday] = await ctx.db
    .insert(holidays)
    .values({ ...input, branchId: input.branchId ?? null })
    .returning();
  return holiday;
}

export async function updateHoliday(ctx: Context, input: UpdateHolidayInput) {
  const [existing] = await ctx.db.select().from(holidays).where(eq(holidays.id, input.id)).limit(1);
  if (!existing) notFound("Holiday");
  await requirePermission(ctx, "holidays.update", existing.branchId ?? undefined);
  const { id: holidayId, ...values } = input;
  const [holiday] = await ctx.db
    .update(holidays)
    .set(values)
    .where(eq(holidays.id, holidayId))
    .returning();
  return holiday;
}

export async function deleteHoliday(ctx: Context, input: HolidayIdInput) {
  const [existing] = await ctx.db.select().from(holidays).where(eq(holidays.id, input.id)).limit(1);
  if (!existing) notFound("Holiday");
  await requirePermission(ctx, "holidays.delete", existing.branchId ?? undefined);
  const [holiday] = await ctx.db
    .delete(holidays)
    .where(and(eq(holidays.id, input.id)))
    .returning();
  return holiday;
}
