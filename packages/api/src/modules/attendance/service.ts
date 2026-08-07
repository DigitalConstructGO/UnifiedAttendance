import { and, asc, desc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";

import {
  attendanceDays,
  attendanceEvents,
  attendancePushBatches,
  employmentPeriods,
  employees,
  manualAttendanceEntries,
  people,
} from "@UnifiedAttendance/db/schema/index";
import { EMPLOYEE_STATUSES } from "@UnifiedAttendance/db/schema/workforce-enums";

import { deriveAttendanceDay } from "../../attendance/derive-day";
import { employeeBranchOrThrow, requirePermission, requireSessionUser } from "../shared/guards";

import type {
  ListDaysInput,
  ListDailyRegisterInput,
  ListEventsInput,
  ListManualAttendanceEntriesInput,
  ListPushBatchesInput,
  CreateManualAttendanceEntryInput,
  RecomputeDayInput,
} from "../../validations/attendance";
import type { Context } from "../../context";

export async function listEvents(ctx: Context, input: ListEventsInput) {
  if (!input.employeeId) await requirePermission(ctx, "attendance:read");
  if (input.employeeId)
    await requirePermission(
      ctx,
      "attendance:read",
      await employeeBranchOrThrow(ctx, input.employeeId),
    );
  const conditions = [
    input.employeeId ? eq(attendanceEvents.employeeId, input.employeeId) : undefined,
    input.deviceId ? eq(attendanceEvents.deviceId, input.deviceId) : undefined,
    input.from ? gte(attendanceEvents.occurredAt, input.from) : undefined,
    input.to ? lte(attendanceEvents.occurredAt, input.to) : undefined,
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
  return ctx.db
    .select()
    .from(attendanceEvents)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(attendanceEvents.occurredAt))
    .limit(input.limit);
}

export async function listDays(ctx: Context, input: ListDaysInput) {
  await requirePermission(
    ctx,
    "attendance:read",
    await employeeBranchOrThrow(ctx, input.employeeId),
  );
  const conditions = [
    eq(attendanceDays.employeeId, input.employeeId),
    input.from ? gte(attendanceDays.attendanceDate, input.from) : undefined,
    input.to ? lte(attendanceDays.attendanceDate, input.to) : undefined,
  ].filter((condition): condition is NonNullable<typeof condition> => Boolean(condition));
  return ctx.db
    .select()
    .from(attendanceDays)
    .where(and(...conditions))
    .orderBy(desc(attendanceDays.attendanceDate))
    .limit(input.limit);
}

export async function recomputeDay(ctx: Context, input: RecomputeDayInput) {
  const [period] = await ctx.db
    .select({ branchId: employmentPeriods.branchId })
    .from(employmentPeriods)
    .where(
      and(
        eq(employmentPeriods.employeeId, input.employeeId),
        lte(employmentPeriods.effectiveFrom, input.date),
        or(isNull(employmentPeriods.effectiveTo), gte(employmentPeriods.effectiveTo, input.date)),
      ),
    )
    .limit(1);
  const branchId = period?.branchId ?? (await employeeBranchOrThrow(ctx, input.employeeId));
  await requirePermission(ctx, "attendance:manage", branchId);
  return deriveAttendanceDay(ctx, {
    employeeId: input.employeeId,
    attendanceDate: input.date,
  });
}

/** Enough to hide latency on a cold day, few enough to leave the pool usable. */
const DERIVE_CONCURRENCY = 8;

export async function listDailyRegister(ctx: Context, input: ListDailyRegisterInput) {
  await requirePermission(ctx, "attendance:read", input.branchId);
  const periods = await ctx.db
    .select({ period: employmentPeriods, employee: employees, person: people })
    .from(employmentPeriods)
    .innerJoin(employees, eq(employmentPeriods.employeeId, employees.id))
    .innerJoin(people, eq(employees.personId, people.id))
    .where(
      and(
        eq(employmentPeriods.branchId, input.branchId),
        eq(employmentPeriods.status, EMPLOYEE_STATUSES[0]),
        lte(employmentPeriods.effectiveFrom, input.date),
        or(isNull(employmentPeriods.effectiveTo), gte(employmentPeriods.effectiveTo, input.date)),
        input.departmentId ? eq(employmentPeriods.departmentId, input.departmentId) : undefined,
      ),
    )
    .orderBy(asc(people.firstName), asc(people.lastName));
  const search = input.search?.toLocaleLowerCase();
  const matching = search
    ? periods.filter(({ employee, person }) =>
        `${person.firstName} ${person.lastName} ${employee.employeeCode}`
          .toLocaleLowerCase()
          .includes(search),
      )
    : periods;
  const page = matching.slice(input.offset, input.offset + input.limit);
  if (page.length === 0) return { rows: [], total: matching.length };

  /*
   * Read the stored days first, derive only what is missing.
   *
   * This used to derive every employee on the page on every read, which cost
   * one multi-query derivation per head: fifty people took twenty to thirty
   * seconds, and re-opening the same day was no faster because nothing was
   * reused. Every write path already derives — device pushes, manual entries,
   * corrections — so a stored day is authoritative and only a gap needs filling.
   */
  const employeeIds = page.map(({ employee }) => employee.id);
  const stored = await ctx.db
    .select()
    .from(attendanceDays)
    .where(
      and(
        inArray(attendanceDays.employeeId, employeeIds),
        eq(attendanceDays.attendanceDate, input.date),
      ),
    );
  const byEmployee = new Map(stored.map((day) => [day.employeeId, day]));

  // Days nobody has computed yet: a date before any punch arrived, or an
  // employee added after the fact. Bounded so a cold branch cannot open fifty
  // derivations at once and exhaust the pool.
  const missing = employeeIds.filter((id) => !byEmployee.has(id));
  const queue = [...missing];
  await Promise.all(
    Array.from({ length: Math.min(DERIVE_CONCURRENCY, queue.length) }, async () => {
      for (let id = queue.pop(); id !== undefined; id = queue.pop()) {
        byEmployee.set(id, await deriveAttendanceDay(ctx, { employeeId: id, attendanceDate: input.date }));
      }
    }),
  );

  const rows = page.map(({ employee, person, period }) => ({
    employee,
    person,
    period,
    day: byEmployee.get(employee.id)!,
  }));
  return { rows, total: matching.length };
}

export async function listManualAttendanceEntries(
  ctx: Context,
  input: ListManualAttendanceEntriesInput,
) {
  await requirePermission(
    ctx,
    "attendance:read",
    await employeeBranchOrThrow(ctx, input.employeeId),
  );
  return ctx.db
    .select()
    .from(manualAttendanceEntries)
    .where(
      and(
        eq(manualAttendanceEntries.employeeId, input.employeeId),
        eq(manualAttendanceEntries.attendanceDate, input.date),
      ),
    )
    .orderBy(desc(manualAttendanceEntries.createdAt));
}

export async function createManualAttendanceEntry(
  ctx: Context,
  input: CreateManualAttendanceEntryInput,
) {
  const [period] = await ctx.db
    .select({ branchId: employmentPeriods.branchId })
    .from(employmentPeriods)
    .where(
      and(
        eq(employmentPeriods.employeeId, input.employeeId),
        lte(employmentPeriods.effectiveFrom, input.attendanceDate),
        or(
          isNull(employmentPeriods.effectiveTo),
          gte(employmentPeriods.effectiveTo, input.attendanceDate),
        ),
      ),
    )
    .limit(1);
  const branchId = period?.branchId ?? (await employeeBranchOrThrow(ctx, input.employeeId));
  await requirePermission(ctx, "attendance:manage", branchId);
  const [entry] = await ctx.db
    .insert(manualAttendanceEntries)
    .values({
      ...input,
      occurredAt: input.occurredAt ?? null,
      createdBy: requireSessionUser(ctx),
    })
    .returning();
  const day = await deriveAttendanceDay(ctx, {
    employeeId: input.employeeId,
    attendanceDate: input.attendanceDate,
  });
  return { entry, day };
}

export async function listPushBatches(ctx: Context, input: ListPushBatchesInput) {
  await requirePermission(ctx, "attendance:read");
  return ctx.db
    .select()
    .from(attendancePushBatches)
    .where(input.deviceId ? eq(attendancePushBatches.deviceId, input.deviceId) : undefined)
    .orderBy(desc(attendancePushBatches.receivedAt))
    .limit(input.limit);
}
