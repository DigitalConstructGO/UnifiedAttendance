import { and, asc, desc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";

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
import { badRequest } from "../../errors";
import { expectedDaysCte, loadBranchToday } from "../reports/expected-days";
import { employeeBranchOrThrow, requirePermission, requireSessionUser } from "../shared/guards";

import type { RegisterStatus } from "../../validations/attendance";
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
  if (!input.employeeId) await requirePermission(ctx, "attendance.read");
  if (input.employeeId)
    await requirePermission(
      ctx,
      "attendance.read",
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
    "attendance.read",
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
  await requirePermission(ctx, "attendance.recompute", branchId);
  return deriveAttendanceDay(ctx, {
    employeeId: input.employeeId,
    attendanceDate: input.date,
  });
}

const DERIVE_CONCURRENCY = 8;

export async function listDailyRegister(ctx: Context, input: ListDailyRegisterInput) {
  await requirePermission(ctx, "attendance.read", input.branchId);
  const branchToday = await loadBranchToday(ctx);
  const cte = expectedDaysCte({
    from: input.date,
    to: input.date,
    branchToday,
    branchId: input.branchId,
    departmentId: input.departmentId,
  });
  const [periods, { rows: statusRows }] = await Promise.all([
    ctx.db
      .select({ period: employmentPeriods, employee: employees, person: people })
      .from(employmentPeriods)
      .innerJoin(employees, eq(employmentPeriods.employeeId, employees.id))
      .innerJoin(people, eq(employees.personId, people.id))
      .where(
        and(
          eq(employmentPeriods.branchId, input.branchId),
          eq(employmentPeriods.status, EMPLOYEE_STATUSES[0]),
          isNull(employees.archivedAt),
          lte(employmentPeriods.effectiveFrom, input.date),
          or(isNull(employmentPeriods.effectiveTo), gte(employmentPeriods.effectiveTo, input.date)),
          input.departmentId ? eq(employmentPeriods.departmentId, input.departmentId) : undefined,
        ),
      )
      .orderBy(asc(people.firstName), asc(people.lastName)),
    ctx.db.execute<{
      employee_id: string;
      status: RegisterStatus;
    }>(sql`
    ${cte}
    select ep.employee_id,
           case
             when ad.id is null then (case when e.employee_id is not null then 'absent' else 'off_day' end)
             when ad.day_type <> 'working_day' and ad.outcome = 'absent' then 'off_day'
             when coalesce(ad.late_minutes, 0) > 0 then 'late'
             when ad.outcome = 'absent' then 'absent'
             when ad.outcome in ('partial', 'unknown') then 'missing_punch'
             else 'present'
           end as status
    from (
      select distinct ep.employee_id
      from employment_periods ep
      join employees emp
        on emp.id = ep.employee_id
       and emp.archived_at is null
      where ep.status = 'active'
        and ep.effective_from <= ${input.date}
        and (ep.effective_to is null or ep.effective_to >= ${input.date})
        and ep.branch_id = ${input.branchId}
        ${input.departmentId ? sql`and ep.department_id = ${input.departmentId}` : sql``}
    ) ep
    left join expected e on e.employee_id = ep.employee_id
    left join attendance_days ad
      on ad.employee_id = ep.employee_id
     and ad.attendance_date = ${input.date}
  `),
  ]);
  const statusOf = new Map(statusRows.map((row) => [row.employee_id, row.status]));

  const search = input.search?.toLocaleLowerCase();
  const matching = search
    ? periods.filter(({ employee, person }) =>
        `${person.firstName} ${person.lastName} ${employee.employeeCode}`
          .toLocaleLowerCase()
          .includes(search),
      )
    : periods;

  const counts: Record<RegisterStatus, number> = {
    present: 0,
    late: 0,
    absent: 0,
    off_day: 0,
    missing_punch: 0,
  };
  for (const { employee } of matching) {
    const status = statusOf.get(employee.id);
    if (status) counts[status] += 1;
  }

  const filtered = input.status
    ? matching.filter(({ employee }) => statusOf.get(employee.id) === input.status)
    : matching;
  const page = filtered.slice(input.offset, input.offset + input.limit);
  if (page.length === 0) return { rows: [], counts, total: filtered.length };

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
  const byEmployee = new Map<string, Awaited<ReturnType<typeof deriveAttendanceDay>>>(
    stored.map((day) => [day.employeeId, day]),
  );

  const isToday = branchToday.get(input.branchId) === input.date;
  const missing = employeeIds.filter((id) => {
    const day = byEmployee.get(id);
    if (!day) return true;
    return isToday && day.firstIn && !day.lastOut;
  });
  const queue = [...missing];
  await Promise.all(
    Array.from({ length: Math.min(DERIVE_CONCURRENCY, queue.length) }, async () => {
      for (let id = queue.pop(); id !== undefined; id = queue.pop()) {
        byEmployee.set(
          id,
          await deriveAttendanceDay(ctx, { employeeId: id, attendanceDate: input.date }),
        );
      }
    }),
  );

  const rows = page.map(({ employee, person, period }) => ({
    employee,
    person,
    period,
    day: byEmployee.get(employee.id)!,
  }));
  return { rows, counts, total: filtered.length };
}

export async function listManualAttendanceEntries(
  ctx: Context,
  input: ListManualAttendanceEntriesInput,
) {
  await requirePermission(
    ctx,
    "attendance.read",
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
  await requirePermission(ctx, "attendance.record", branchId);

  if (input.kind === "check_out" || input.kind === "check_in") {
    const current = await deriveAttendanceDay(ctx, {
      employeeId: input.employeeId,
      attendanceDate: input.attendanceDate,
    });
    if (input.kind === "check_out") {
      if (!current.firstIn) {
        badRequest("Record the check-in first — there is no check-in for this day yet.");
      }
      if (input.occurredAt && input.occurredAt <= current.firstIn) {
        badRequest("The check-out must be later than the check-in.");
      }
    } else if (input.occurredAt && current.lastOut && input.occurredAt >= current.lastOut) {
      badRequest("The check-in must be earlier than the recorded check-out.");
    }
  }

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
  await requirePermission(ctx, "attendance.read");
  return ctx.db
    .select()
    .from(attendancePushBatches)
    .where(input.deviceId ? eq(attendancePushBatches.deviceId, input.deviceId) : undefined)
    .orderBy(desc(attendancePushBatches.receivedAt))
    .limit(input.limit);
}
