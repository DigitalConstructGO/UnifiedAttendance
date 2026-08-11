import { and, eq, gte, isNull, lte, or, sql } from "drizzle-orm";

import {
  branches,
  departments,
  employees,
  employmentPeriods,
  people,
} from "@UnifiedAttendance/db/schema/index";

import { requirePermission } from "../shared/guards";
import { expectedDaysCte, loadBranchToday } from "./expected-days";

import type { AttendanceSummaryInput } from "../../validations/reports";
import type { Context } from "../../context";

type ByDayRow = {
  date: string;
  on_time: number;
  late: number;
  partial: number;
  absent: number;
  unrecorded: number;
};

type SummaryAggregateRow = {
  employee_id: string;
  expected_days: number;
  present_days: number;
  partial_days: number;
  late_days: number;
  late_present_days: number;
  late_minutes: number;
  absent_days: number;
  unrecorded_days: number;
  worked_minutes: number;
  missing_punch_days: number;
  corrected_days: number;
};

export type AttendanceSummaryStats = {
  expectedDays: number;
  presentDays: number;
  partialDays: number;
  lateDays: number;
  latePresentDays: number;
  lateMinutes: number;
  absentDays: number;
  unrecordedDays: number;
  workedMinutes: number;
  missingPunchDays: number;
  correctedDays: number;
  attendanceRatePercent: number;
  punctualityRatePercent: number;
};

const percent = (part: number, whole: number) =>
  whole === 0 ? 0 : Math.round((part / whole) * 10_000) / 100;

function toStats(row: Omit<SummaryAggregateRow, "employee_id">): AttendanceSummaryStats {
  return {
    expectedDays: row.expected_days,
    presentDays: row.present_days,
    partialDays: row.partial_days,
    lateDays: row.late_days,
    latePresentDays: row.late_present_days,
    lateMinutes: row.late_minutes,
    absentDays: row.absent_days,
    unrecordedDays: row.unrecorded_days,
    workedMinutes: row.worked_minutes,
    missingPunchDays: row.missing_punch_days,
    correctedDays: row.corrected_days,
    attendanceRatePercent: percent(row.present_days + row.partial_days, row.expected_days),
    punctualityRatePercent: percent(row.present_days - row.late_present_days, row.present_days),
  };
}

const EMPTY_AGGREGATE: Omit<SummaryAggregateRow, "employee_id"> = {
  expected_days: 0,
  present_days: 0,
  partial_days: 0,
  late_days: 0,
  late_present_days: 0,
  late_minutes: 0,
  absent_days: 0,
  unrecorded_days: 0,
  worked_minutes: 0,
  missing_punch_days: 0,
  corrected_days: 0,
};

export async function getAttendanceSummary(ctx: Context, input: AttendanceSummaryInput) {
  await requirePermission(ctx, "reports.read", input.branchId);

  const period = {
    from: input.from,
    to: input.to,
    branchId: input.branchId ?? null,
    departmentId: input.departmentId ?? null,
  };
  const empty = {
    period,
    totals: { employees: 0, ...toStats(EMPTY_AGGREGATE) },
    rows: [] as never[],
    byDay: [] as Array<{
      date: string;
      onTime: number;
      late: number;
      partial: number;
      absent: number;
      unrecorded: number;
    }>,
    total: 0,
  };

  const branchToday = await loadBranchToday(ctx);
  if (branchToday.size === 0) return empty;

  const cte = expectedDaysCte({ ...input, branchToday });
  const [{ rows: aggregates }, { rows: dayRows }, labelRows] = await Promise.all([
    ctx.db.execute<SummaryAggregateRow>(sql`
      ${cte}
      select e.employee_id,
             count(*)::int as expected_days,
             count(*) filter (where ad.outcome = 'present')::int as present_days,
             count(*) filter (where ad.outcome = 'partial')::int as partial_days,
             count(*) filter (where coalesce(ad.late_minutes, 0) > 0)::int as late_days,
             count(*) filter (where ad.outcome = 'present'
                          and coalesce(ad.late_minutes, 0) > 0)::int as late_present_days,
             coalesce(sum(ad.late_minutes), 0)::int as late_minutes,
             count(*) filter (where ad.outcome = 'absent'
                           or (ad.id is null and e.is_before_today))::int as absent_days,
             count(*) filter (where ad.outcome = 'unknown'
                           or (ad.id is null and not e.is_before_today))::int as unrecorded_days,
             coalesce(sum(ad.worked_minutes), 0)::int as worked_minutes,
             count(*) filter (where ad.missing_check_in or ad.missing_check_out)::int as missing_punch_days,
             count(*) filter (where ad.has_correction)::int as corrected_days
      from expected e
      left join attendance_days ad
        on ad.employee_id = e.employee_id
       and ad.attendance_date = e.day
      group by e.employee_id
    `),
    ctx.db.execute<ByDayRow>(sql`
      ${cte}
      select e.day::text as date,
             count(*) filter (where ad.outcome = 'present'
                          and coalesce(ad.late_minutes, 0) = 0)::int as on_time,
             count(*) filter (where coalesce(ad.late_minutes, 0) > 0)::int as late,
             count(*) filter (where ad.outcome = 'partial'
                          and coalesce(ad.late_minutes, 0) = 0)::int as partial,
             count(*) filter (where (ad.outcome = 'absent'
                           or (ad.id is null and e.is_before_today))
                          and coalesce(ad.late_minutes, 0) = 0)::int as absent,
             count(*) filter (where (ad.outcome = 'unknown'
                           or (ad.id is null and not e.is_before_today))
                          and coalesce(ad.late_minutes, 0) = 0)::int as unrecorded
      from expected e
      left join attendance_days ad
        on ad.employee_id = e.employee_id
       and ad.attendance_date = e.day
      group by e.day
      order by e.day
    `),
    ctx.db
      .select({
        period: employmentPeriods,
        employee: { id: employees.id, employeeCode: employees.employeeCode },
        person: { firstName: people.firstName, lastName: people.lastName },
        branchName: branches.name,
        departmentName: departments.name,
      })
      .from(employmentPeriods)
      .innerJoin(employees, eq(employmentPeriods.employeeId, employees.id))
      .innerJoin(people, eq(employees.personId, people.id))
      .innerJoin(branches, eq(employmentPeriods.branchId, branches.id))
      .leftJoin(departments, eq(employmentPeriods.departmentId, departments.id))
      .where(
        and(
          eq(employmentPeriods.status, "active"),
          lte(employmentPeriods.effectiveFrom, input.to),
          or(isNull(employmentPeriods.effectiveTo), gte(employmentPeriods.effectiveTo, input.from)),
          input.branchId ? eq(employmentPeriods.branchId, input.branchId) : undefined,
          input.departmentId ? eq(employmentPeriods.departmentId, input.departmentId) : undefined,
        ),
      ),
  ]);

  const labels = new Map<string, (typeof labelRows)[number]>();
  for (const row of labelRows) {
    const current = labels.get(row.employee.id);
    if (!current || row.period.effectiveFrom > current.period.effectiveFrom) {
      labels.set(row.employee.id, row);
    }
  }

  const allRows = aggregates.flatMap((aggregate) => {
    const label = labels.get(aggregate.employee_id);
    if (!label) return [];
    return [
      {
        employee: label.employee,
        person: label.person,
        branch: { id: label.period.branchId, name: label.branchName },
        department: label.period.departmentId
          ? { id: label.period.departmentId, name: label.departmentName ?? "" }
          : null,
        ...toStats(aggregate),
      },
    ];
  });

  const search = input.search?.toLocaleLowerCase();
  const matching = search
    ? allRows.filter(({ person, employee }) =>
        `${person.firstName} ${person.lastName} ${employee.employeeCode}`
          .toLocaleLowerCase()
          .includes(search),
      )
    : allRows;

  const byName = (a: (typeof matching)[number], b: (typeof matching)[number]) =>
    `${a.person.firstName} ${a.person.lastName}`.localeCompare(
      `${b.person.firstName} ${b.person.lastName}`,
    );
  matching.sort((a, b) => {
    switch (input.sort) {
      case "lateDays":
        return b.lateDays - a.lateDays || byName(a, b);
      case "lateMinutes":
        return b.lateMinutes - a.lateMinutes || byName(a, b);
      case "absentDays":
        return b.absentDays - a.absentDays || byName(a, b);
      // Worst attendance first — the report exists to surface problems.
      case "attendanceRate":
        return a.attendanceRatePercent - b.attendanceRatePercent || byName(a, b);
      default:
        return byName(a, b);
    }
  });

  const totals = matching.reduce(
    (sum, row) => ({
      expected_days: sum.expected_days + row.expectedDays,
      present_days: sum.present_days + row.presentDays,
      partial_days: sum.partial_days + row.partialDays,
      late_days: sum.late_days + row.lateDays,
      late_present_days: sum.late_present_days + row.latePresentDays,
      late_minutes: sum.late_minutes + row.lateMinutes,
      absent_days: sum.absent_days + row.absentDays,
      unrecorded_days: sum.unrecorded_days + row.unrecordedDays,
      worked_minutes: sum.worked_minutes + row.workedMinutes,
      missing_punch_days: sum.missing_punch_days + row.missingPunchDays,
      corrected_days: sum.corrected_days + row.correctedDays,
    }),
    { ...EMPTY_AGGREGATE },
  );

  return {
    period,
    totals: { employees: matching.length, ...toStats(totals) },
    rows: matching.slice(input.offset, input.offset + input.limit),
    byDay: dayRows.map((row) => ({
      date: row.date,
      onTime: row.on_time,
      late: row.late,
      partial: row.partial,
      absent: row.absent,
      unrecorded: row.unrecorded,
    })),
    total: matching.length,
  };
}
