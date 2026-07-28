import { and, eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@UnifiedAttendance/db";
import { branchWorkingDays, branches, holidays, organizations } from "@UnifiedAttendance/db/schema/index";

import { protectedProcedure, router } from "../index";
import { notFound, requirePermission, requireSuperAdmin } from "./shared";

const id = z.uuid();
const optionalText = z.string().trim().min(1).nullable().optional();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const organizationRouter = router({
  get: protectedProcedure.query(async ({ ctx }) => {
    await requirePermission(ctx, "organization:read");
    const [organization] = await db.select().from(organizations).limit(1);
    return organization ?? null;
  }),

  create: protectedProcedure
    .input(z.object({ name: z.string().trim().min(1), code: z.string().trim().min(1), timezone: z.string().trim().min(1).default("Africa/Addis_Ababa"), logoUrl: z.string().url().nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      await requireSuperAdmin(ctx);
      const existing = await db.select({ id: organizations.id }).from(organizations).limit(1);
      if (existing.length > 0) throw new Error("An organization already exists");
      const [organization] = await db.insert(organizations).values(input).returning();
      return organization;
    }),

  update: protectedProcedure
    .input(z.object({ id, name: z.string().trim().min(1).optional(), code: z.string().trim().min(1).optional(), timezone: z.string().trim().min(1).optional(), logoUrl: z.string().url().nullable().optional(), status: z.enum(["active", "suspended"]).optional() }))
    .mutation(async ({ ctx, input }) => {
      await requirePermission(ctx, "organization:manage");
      const { id: organizationId, ...values } = input;
      const [organization] = await db.update(organizations).set(values).where(eq(organizations.id, organizationId)).returning();
      return organization ?? null;
    }),

  branches: protectedProcedure.query(async ({ ctx }) => {
    await requirePermission(ctx, "organization:read");
    return db.select().from(branches).orderBy(branches.name);
  }),

  branch: protectedProcedure.input(z.object({ id })).query(async ({ ctx, input }) => {
    const [branch] = await db.select().from(branches).where(eq(branches.id, input.id)).limit(1);
    if (!branch) notFound("Branch");
    await requirePermission(ctx, "organization:read", branch.id);
    return branch;
  }),

  createBranch: protectedProcedure
    .input(z.object({ name: z.string().trim().min(1), code: z.string().trim().min(1), address: optionalText, timezone: z.string().trim().min(1).optional() }))
    .mutation(async ({ ctx, input }) => {
      await requirePermission(ctx, "organization:manage");
      const [branch] = await db.insert(branches).values(input).returning();
      return branch;
    }),

  updateBranch: protectedProcedure
    .input(z.object({ id, name: z.string().trim().min(1).optional(), code: z.string().trim().min(1).optional(), address: optionalText, timezone: z.string().trim().min(1).optional(), status: z.enum(["active", "closed"]).optional() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db.select({ id: branches.id }).from(branches).where(eq(branches.id, input.id)).limit(1);
      if (!existing) notFound("Branch");
      await requirePermission(ctx, "organization:manage", existing.id);
      const { id: branchId, ...values } = input;
      const [branch] = await db.update(branches).set(values).where(eq(branches.id, branchId)).returning();
      return branch;
    }),

  workingDays: protectedProcedure.input(z.object({ branchId: id })).query(async ({ ctx, input }) => {
    await requirePermission(ctx, "organization:read", input.branchId);
    return db.select().from(branchWorkingDays).where(eq(branchWorkingDays.branchId, input.branchId)).orderBy(branchWorkingDays.weekday);
  }),

  replaceWorkingDays: protectedProcedure
    .input(z.object({ branchId: id, days: z.array(z.object({ weekday: z.number().int().min(0).max(6), isWorkingDay: z.boolean(), openingTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional(), closingTime: z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/).nullable().optional() })).length(7) }))
    .mutation(async ({ ctx, input }) => {
      await requirePermission(ctx, "organization:manage", input.branchId);
      return db.transaction(async (tx) => {
        await tx.delete(branchWorkingDays).where(eq(branchWorkingDays.branchId, input.branchId));
        return tx.insert(branchWorkingDays).values(input.days.map((day) => ({ ...day, branchId: input.branchId }))).returning();
      });
    }),

  holidays: protectedProcedure.input(z.object({ branchId: id.nullable().optional() })).query(async ({ ctx, input }) => {
    await requirePermission(ctx, "organization:read", input.branchId ?? undefined);
    return input.branchId
      ? db.select().from(holidays).where(eq(holidays.branchId, input.branchId)).orderBy(holidays.holidayDate)
      : db.select().from(holidays).orderBy(holidays.holidayDate);
  }),

  createHoliday: protectedProcedure
    .input(z.object({ name: z.string().trim().min(1), holidayDate: date, branchId: id.nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      await requirePermission(ctx, "organization:manage", input.branchId ?? undefined);
      const [holiday] = await db.insert(holidays).values({ ...input, branchId: input.branchId ?? null }).returning();
      return holiday;
    }),

  updateHoliday: protectedProcedure
    .input(z.object({ id, name: z.string().trim().min(1).optional(), holidayDate: date.optional(), branchId: id.nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db.select().from(holidays).where(eq(holidays.id, input.id)).limit(1);
      if (!existing) notFound("Holiday");
      await requirePermission(ctx, "organization:manage", existing.branchId ?? undefined);
      const { id: holidayId, ...values } = input;
      const [holiday] = await db.update(holidays).set(values).where(eq(holidays.id, holidayId)).returning();
      return holiday;
    }),

  deleteHoliday: protectedProcedure.input(z.object({ id })).mutation(async ({ ctx, input }) => {
    const [existing] = await db.select().from(holidays).where(eq(holidays.id, input.id)).limit(1);
    if (!existing) notFound("Holiday");
    await requirePermission(ctx, "organization:manage", existing.branchId ?? undefined);
    const [holiday] = await db.delete(holidays).where(and(eq(holidays.id, input.id))).returning();
    return holiday;
  }),
});
