import { and, asc, eq, isNotNull, isNull, ne, sql } from "drizzle-orm";

import { db, rawGet } from "@UnifiedAttendance/db";
import {
  attendanceDevices,
  branchWorkingDays,
  branches,
  employees,
  holidays,
  organizations,
} from "@UnifiedAttendance/db/schema/index";

import { badRequest, conflict, notFound } from "../../errors";
import { withTransaction } from "../../context";
import { ensureEthiopianHolidays, syncEthiopianHolidays } from "../holidays/ethiopian";
import { requireAdministrator, requirePermission, requireSuperAdmin } from "../shared/guards";

import type {
  BranchIdInput,
  CreateBranchInput,
  CreateHolidayInput,
  CreateOrganizationInput,
  BootstrapOrganizationInput,
  HolidayIdInput,
  ListBranchesInput,
  ListHolidaysInput,
  ReplaceWorkingDaysInput,
  UpdateBranchInput,
  UpdateHolidayInput,
  OrganizationLogoUploadInput,
  UpdateOrganizationInput,
  WorkingDaysInput,
} from "../../validations/organization";
import type { Context } from "../../context";

export async function getOrganization(ctx: Context) {
  await requirePermission(ctx, "organization.read");
  const [organization] = await ctx.db.select().from(organizations).limit(1);
  return organization ?? null;
}

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
  const row = (await rawGet<{
    organization_exists: number;
    branch_exists: number;
    schedule_complete: number;
  }>(
    ctx.db,
    sql`
    select
      exists (select 1 from ${organizations}) as organization_exists,
      exists (select 1 from ${branches}) as branch_exists,
      (
        select count(distinct ${branchWorkingDays.weekday}) = 7
        from ${branchWorkingDays}
        where ${branchWorkingDays.branchId} =
          (select ${branches.id} from ${branches} order by ${branches.createdAt} limit 1)
      ) as schedule_complete
  `,
  ))!;
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

/**
 * Where the organization's logo lives in object storage. One fixed key per
 * organization: re-uploading replaces the previous logo in place, and the
 * stored `logoUrl` (which carries the asset version) is what changes.
 */
export function organizationLogoStorageKey(organizationId: string) {
  return `organization/${organizationId}/logo`;
}

/**
 * Checks that the caller may replace the logo and that the organization
 * exists, and hands back the storage key the upload must target. The HTTP
 * layer turns that into signed upload parameters; the public URL Cloudinary
 * returns is then saved with `updateOrganization({ logoUrl })`.
 */
export async function authorizeOrganizationLogoUpload(
  ctx: Context,
  input: OrganizationLogoUploadInput,
) {
  await requirePermission(ctx, "organization.update");
  const [organization] = await ctx.db
    .select({ id: organizations.id })
    .from(organizations)
    .where(eq(organizations.id, input.id))
    .limit(1);
  if (!organization) notFound("Organization not found");
  return {
    storageKey: organizationLogoStorageKey(organization.id),
    contentType: input.contentType,
  };
}

export async function listBranches(ctx: Context, input: ListBranchesInput = {}) {
  await requirePermission(ctx, "branches.read");
  return ctx.db
    .select()
    .from(branches)
    .where(input.archived ? isNotNull(branches.archivedAt) : isNull(branches.archivedAt))
    .orderBy(branches.name);
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

async function referenceWorkingDays(ctx: Context, excludeBranchId?: string) {
  const [reference] = await ctx.db
    .select({ id: branches.id })
    .from(branches)
    .where(
      and(
        isNull(branches.archivedAt),
        excludeBranchId ? ne(branches.id, excludeBranchId) : undefined,
      ),
    )
    .orderBy(asc(branches.createdAt))
    .limit(1);
  if (reference) {
    const days = await ctx.db
      .select({
        weekday: branchWorkingDays.weekday,
        isWorkingDay: branchWorkingDays.isWorkingDay,
        openingTime: branchWorkingDays.openingTime,
        closingTime: branchWorkingDays.closingTime,
      })
      .from(branchWorkingDays)
      .where(eq(branchWorkingDays.branchId, reference.id));
    if (days.length > 0) return days;
  }
  return Array.from({ length: 7 }, (_, weekday) => {
    const isWorkingDay = weekday < 5;
    return {
      weekday,
      isWorkingDay,
      openingTime: isWorkingDay ? "8:00 AM" : null,
      closingTime: isWorkingDay ? "5:00 PM" : null,
    };
  });
}

export async function createBranch(ctx: Context, input: CreateBranchInput) {
  await requirePermission(ctx, "branches.create");
  return withTransaction(ctx, async (ctx) => {
    const [branch] = await ctx.db.insert(branches).values(input).returning();
    if (!branch) throw new Error("Could not create the branch");
    const days = await referenceWorkingDays(ctx, branch.id);
    await ctx.db
      .insert(branchWorkingDays)
      .values(days.map((day) => ({ ...day, branchId: branch.id })));
    return branch;
  });
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

export async function archiveBranch(ctx: Context, input: BranchIdInput) {
  const branch = await getBranch(ctx, input);
  await requirePermission(ctx, "branches.archive", branch.id);
  if (branch.archivedAt) return branch;
  const [archived] = await ctx.db
    .update(branches)
    .set({ archivedAt: new Date() })
    .where(eq(branches.id, branch.id))
    .returning();
  return archived ?? branch;
}

export async function restoreBranch(ctx: Context, input: BranchIdInput) {
  const branch = await getBranch(ctx, input);
  await requirePermission(ctx, "branches.restore", branch.id);
  if (!branch.archivedAt) return branch;
  const [restored] = await ctx.db
    .update(branches)
    .set({ archivedAt: null })
    .where(eq(branches.id, branch.id))
    .returning();
  return restored ?? branch;
}

export async function deleteBranch(ctx: Context, input: BranchIdInput) {
  const branch = await getBranch(ctx, input);
  await requirePermission(ctx, "branches.delete", branch.id);
  if (!branch.archivedAt) {
    badRequest("Archive this branch first — deletion is only allowed from the archive");
  }
  const [[employee], [device]] = await Promise.all([
    ctx.db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.branchId, branch.id))
      .limit(1),
    ctx.db
      .select({ id: attendanceDevices.id })
      .from(attendanceDevices)
      .where(eq(attendanceDevices.branchId, branch.id))
      .limit(1),
  ]);
  if (employee) {
    conflict(
      "This branch still has employees assigned to it, so it cannot be deleted. Move or remove them first.",
    );
  }
  if (device) {
    conflict(
      "This branch still has enrolled attendance devices, so it cannot be deleted. Remove them first.",
    );
  }
  const [deleted] = await ctx.db.delete(branches).where(eq(branches.id, branch.id)).returning();
  return deleted;
  return branch;
}

export async function listWorkingDays(ctx: Context, input: WorkingDaysInput) {
  await requirePermission(ctx, "branches.read", input.branchId);
  const existing = await ctx.db
    .select()
    .from(branchWorkingDays)
    .where(eq(branchWorkingDays.branchId, input.branchId))
    .orderBy(branchWorkingDays.weekday);
  if (existing.length > 0) return existing;

  const days = await referenceWorkingDays(ctx, input.branchId);
  const inserted = await ctx.db
    .insert(branchWorkingDays)
    .values(days.map((day) => ({ ...day, branchId: input.branchId })))
    .onConflictDoNothing()
    .returning();
  if (inserted.length > 0) return inserted.sort((a, b) => a.weekday - b.weekday);
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
  // Self-heal: the Ethiopian public holidays appear even if the cron sync never ran.
  await ensureEthiopianHolidays(ctx);
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
  const generated = existing.source === "auto";
  if (generated && input.branchId !== undefined && input.branchId !== null) {
    badRequest("Ethiopian public holidays apply to every branch");
  }
  const corrected =
    generated &&
    ((values.holidayDate !== undefined && values.holidayDate !== existing.holidayDate) ||
      (values.name !== undefined && values.name !== existing.name));
  const [holiday] = await ctx.db
    .update(holidays)
    // A corrected generated holiday becomes manual so the next sync leaves it alone.
    .set(corrected ? { ...values, source: "manual" } : values)
    .where(eq(holidays.id, holidayId))
    .returning();
  return holiday;
}

export async function deleteHoliday(ctx: Context, input: HolidayIdInput) {
  const [existing] = await ctx.db.select().from(holidays).where(eq(holidays.id, input.id)).limit(1);
  if (!existing) notFound("Holiday");
  await requirePermission(ctx, "holidays.delete", existing.branchId ?? undefined);
  if (existing.source === "auto") {
    badRequest("Ethiopian public holidays are generated automatically; edit the date instead");
  }
  const [holiday] = await ctx.db
    .delete(holidays)
    .where(and(eq(holidays.id, input.id)))
    .returning();
  return holiday;
}

/** Regenerates the Ethiopian public holidays for this year and next. */
export async function syncHolidays(ctx: Context) {
  await requirePermission(ctx, "holidays.create");
  return syncEthiopianHolidays(ctx);
}
