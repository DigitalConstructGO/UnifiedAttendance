import { and, desc, eq, gte, lte } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import {
  attendanceDays,
  attendanceEvents,
  attendancePushBatches,
} from "@UnifiedAttendance/db/schema/index";

import { deriveAttendanceDay } from "../../attendance/derive-day";
import { employeeBranchOrThrow, requirePermission } from "../shared/guards";

import type {
  ListDaysInput,
  ListEventsInput,
  ListPushBatchesInput,
  RecomputeDayInput,
} from "../../validations/attendance";
import type { Context } from "../../context";

export async function listEvents(ctx: Context, input: ListEventsInput) {
  if (!input.employeeId) await requirePermission(ctx, "attendance:read");
  if (input.employeeId)
    await requirePermission(ctx, "attendance:read", await employeeBranchOrThrow(input.employeeId));
  const conditions = [
    input.employeeId ? eq(attendanceEvents.employeeId, input.employeeId) : undefined,
    input.deviceId ? eq(attendanceEvents.deviceId, input.deviceId) : undefined,
    input.from ? gte(attendanceEvents.occurredAt, input.from) : undefined,
    input.to ? lte(attendanceEvents.occurredAt, input.to) : undefined,
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
  return db
    .select()
    .from(attendanceEvents)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(attendanceEvents.occurredAt))
    .limit(input.limit);
}

export async function listDays(ctx: Context, input: ListDaysInput) {
  await requirePermission(ctx, "attendance:read", await employeeBranchOrThrow(input.employeeId));
  const conditions = [
    eq(attendanceDays.employeeId, input.employeeId),
    input.from ? gte(attendanceDays.attendanceDate, input.from) : undefined,
    input.to ? lte(attendanceDays.attendanceDate, input.to) : undefined,
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
  return db
    .select()
    .from(attendanceDays)
    .where(and(...conditions))
    .orderBy(desc(attendanceDays.attendanceDate))
    .limit(input.limit);
}

export async function recomputeDay(ctx: Context, input: RecomputeDayInput) {
  const branchId = await employeeBranchOrThrow(input.employeeId);
  await requirePermission(ctx, "attendance:manage", branchId);
  return deriveAttendanceDay({
    employeeId: input.employeeId,
    attendanceDate: input.date,
  });
}

export async function listPushBatches(ctx: Context, input: ListPushBatchesInput) {
  await requirePermission(ctx, "attendance:read");
  return db
    .select()
    .from(attendancePushBatches)
    .where(input.deviceId ? eq(attendancePushBatches.deviceId, input.deviceId) : undefined)
    .orderBy(desc(attendancePushBatches.receivedAt))
    .limit(input.limit);
}
