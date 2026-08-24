import { sql, type SQL } from "drizzle-orm";

import { branches } from "@UnifiedAttendance/db/schema/index";

import { localBusinessDate } from "../clients/shared";

import type { Context } from "../../context";

export type ExpectedDaysParams = {
  from: string;
  to: string;
  branchToday: Map<string, string>;
  branchId?: string;
  departmentId?: string;
  employeeId?: string;
};

const BRANCH_CACHE_TTL_MS = 60_000;
let branchCache: { rows: Array<{ id: string; timezone: string }>; expiresAt: number } | null = null;

export function forgetBranches() {
  branchCache = null;
}

export async function loadBranchToday(ctx: Context) {
  if (!branchCache || branchCache.expiresAt <= Date.now()) {
    const rows = await ctx.db
      .select({ id: branches.id, timezone: branches.timezone })
      .from(branches);
    branchCache = { rows, expiresAt: Date.now() + BRANCH_CACHE_TTL_MS };
  }
  return new Map(branchCache.rows.map((row) => [row.id, localBusinessDate(row.timezone)]));
}

export function expectedDaysCte(params: ExpectedDaysParams): SQL {
  const branchToday = sql.join(
    [...params.branchToday].map(([id, today]) => sql`(${id}, ${today})`),
    sql`, `,
  );
  const periodFilters: SQL[] = [];
  if (params.branchId) periodFilters.push(sql`and ep.branch_id = ${params.branchId}`);
  if (params.departmentId) periodFilters.push(sql`and ep.department_id = ${params.departmentId}`);
  if (params.employeeId) periodFilters.push(sql`and ep.employee_id = ${params.employeeId}`);

  return sql`
    with branch_today (branch_id, today) as (
      values ${branchToday}
    ),
    days (day) as (
      select ${params.from}
      union all
      select date(day, '+1 day') from days where day < ${params.to}
    ),
    expected as (

      select ep.employee_id,
             ep.branch_id,
             ep.department_id,
             d.day,
             (d.day < bt.today) as is_before_today
      from employment_periods ep
      join employees emp
        on emp.id = ep.employee_id
       and emp.has_fixed_schedule
       and emp.archived_at is null
      join days d
        on d.day >= ep.effective_from
       and (ep.effective_to is null or d.day <= ep.effective_to)
      join branches b
        on b.id = ep.branch_id
       and d.day >= date(b.created_at / 1000, 'unixepoch')
      join branch_today bt
        on bt.branch_id = ep.branch_id
      join branch_working_days w
        on w.branch_id = ep.branch_id
       and w.weekday = (cast(strftime('%w', d.day) as integer) + 6) % 7
       and w.is_working_day
      where ep.status = 'active'
        and d.day <= bt.today
        and not exists (
          select 1 from holidays h
          where h.holiday_date = d.day
            and (h.branch_id = ep.branch_id or h.branch_id is null)
        )
        ${sql.join(periodFilters, sql` `)}
      group by ep.employee_id, d.day
      union all
      -- People without a fixed schedule owe no days, so only the days they
      -- actually came count: never absent, never unrecorded.
      select ep.employee_id,
             ep.branch_id,
             ep.department_id,
             ad.attendance_date as day,
             (ad.attendance_date < bt.today) as is_before_today
      from employment_periods ep
      join employees emp
        on emp.id = ep.employee_id
       and not emp.has_fixed_schedule
       and emp.archived_at is null
      join attendance_days ad
        on ad.employee_id = ep.employee_id
       and ad.attendance_date >= ${params.from}
       and ad.attendance_date <= ${params.to}
       and ad.attendance_date >= ep.effective_from
       and (ep.effective_to is null or ad.attendance_date <= ep.effective_to)
      join branch_today bt
        on bt.branch_id = ep.branch_id
      where ep.status = 'active'
        and ad.attendance_date <= bt.today
        ${sql.join(periodFilters, sql` `)}
      group by ep.employee_id, ad.attendance_date
    )
  `;
}
