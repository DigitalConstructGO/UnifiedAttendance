import { and, desc, eq, gte, lte } from "drizzle-orm";
import { z } from "zod";

import { db } from "@UnifiedAttendance/db";
import { attendanceDays, attendanceEvents, attendancePushBatches } from "@UnifiedAttendance/db/schema/index";

import { protectedProcedure, router } from "../index";
import { employeeBranchOrThrow, requirePermission } from "./shared";

const id = z.uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

export const attendanceRouter = router({
  events: protectedProcedure
    .input(z.object({ employeeId: id.optional(), deviceId: id.optional(), from: z.coerce.date().optional(), to: z.coerce.date().optional(), limit: z.number().int().min(1).max(200).default(50) }))
    .query(async ({ ctx, input }) => {
      if (!input.employeeId) await requirePermission(ctx, "attendance:read");
      if (input.employeeId) await requirePermission(ctx, "attendance:read", await employeeBranchOrThrow(input.employeeId));
      const conditions = [input.employeeId ? eq(attendanceEvents.employeeId, input.employeeId) : undefined, input.deviceId ? eq(attendanceEvents.deviceId, input.deviceId) : undefined, input.from ? gte(attendanceEvents.occurredAt, input.from) : undefined, input.to ? lte(attendanceEvents.occurredAt, input.to) : undefined].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
      return db.select().from(attendanceEvents).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(attendanceEvents.occurredAt)).limit(input.limit);
    }),
  days: protectedProcedure
    .input(z.object({ employeeId: id, from: date.optional(), to: date.optional(), limit: z.number().int().min(1).max(366).default(90) }))
    .query(async ({ ctx, input }) => {
      await requirePermission(ctx, "attendance:read", await employeeBranchOrThrow(input.employeeId));
      const conditions = [eq(attendanceDays.employeeId, input.employeeId), input.from ? gte(attendanceDays.attendanceDate, input.from) : undefined, input.to ? lte(attendanceDays.attendanceDate, input.to) : undefined].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
      return db.select().from(attendanceDays).where(and(...conditions)).orderBy(desc(attendanceDays.attendanceDate)).limit(input.limit);
    }),
  pushBatches: protectedProcedure
    .input(z.object({ deviceId: id.optional(), limit: z.number().int().min(1).max(200).default(50) }))
    .query(async ({ ctx, input }) => {
      await requirePermission(ctx, "attendance:read");
      return db.select().from(attendancePushBatches).where(input.deviceId ? eq(attendancePushBatches.deviceId, input.deviceId) : undefined).orderBy(desc(attendancePushBatches.receivedAt)).limit(input.limit);
    }),
});
