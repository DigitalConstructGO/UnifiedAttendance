import { sql, type SQL } from "drizzle-orm";

import { branches } from "@UnifiedAttendance/db/schema/index";

import { localBusinessDate } from "../clients/shared";

import type { Context } from "../../context";

export type ExpectedDaysParams = {
  /** Inclusive YYYY-MM-DD range. */
  from: string;
  to: string;
  /** Branch id → that branch's local business date, from `loadBranchToday`. */
  branchToday: Map<string, string>;
  branchId?: string;
  departmentId?: string;
  employeeId?: string;
};

/** Each branch's "today", read in its own timezone — a branch ahead of the
 * server must not see tomorrow counted, one behind must not see today judged. */
export async function loadBranchToday(ctx: Context) {
  const rows = await ctx.db.select({ id: branches.id, timezone: branches.timezone }).from(branches);
  return new Map(rows.map((row) => [row.id, localBusinessDate(row.timezone)]));
}

/**
 * The keystone of every attendance report: the set of days each employee was
 * *supposed* to work. `attendance_days` rows only exist where some write path
 * derived them, so reporting cannot read absence out of storage — it has to be
 * reconstructed as "expected day with nothing recorded".
 *
 * Emits CTEs ending in `expected(employee_id, branch_id, department_id, day,
 * is_before_today)`: one row per employee per scheduled working day, built from
 * active employment periods (so hire and termination dates bound the range),
 * the branch's working-week, minus holidays, never beyond the branch's local
 * today. The caller appends its own SELECT over `expected`.
 *
 * Two things this deliberately trusts over stored rows: the *current* schedule
 * and holiday calendar decide expectedness (a stored day's frozen `day_type`
 * does not), and a mid-range branch transfer counts each day under the branch
 * that actually applied that day.
 */
export function expectedDaysCte(params: ExpectedDaysParams): SQL {
  const branchToday = sql.join(
    [...params.branchToday].map(([id, today]) => sql`(${id}::uuid, ${today}::date)`),
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
    days as (
      select d::date as day
      from generate_series(${params.from}::date, ${params.to}::date, interval '1 day') d
    ),
    -- distinct on: only open periods are unique per employee in the schema, so
    -- overlapping closed periods must not double-count a day.
    expected as (
      select distinct on (ep.employee_id, d.day)
             ep.employee_id,
             ep.branch_id,
             ep.department_id,
             d.day,
             (d.day < bt.today) as is_before_today
      from employment_periods ep
      join days d
        on d.day >= ep.effective_from
       and (ep.effective_to is null or d.day <= ep.effective_to)
      join branch_today bt
        on bt.branch_id = ep.branch_id
      -- isodow is Monday=1; the schedule stores Monday-first weekdays (see
      -- mondayFirstWeekday in attendance/day-context.ts — dow would be the
      -- Sunday-first off-by-one this codebase already shipped and fixed once).
      join branch_working_days w
        on w.branch_id = ep.branch_id
       and w.weekday = extract(isodow from d.day)::int - 1
       and w.is_working_day
      where ep.status = 'active'
        and d.day <= bt.today
        -- not exists, not a join: a date that is both a branch holiday and a
        -- global (null-branch) holiday must remove the day exactly once.
        and not exists (
          select 1 from holidays h
          where h.holiday_date = d.day
            and (h.branch_id = ep.branch_id or h.branch_id is null)
        )
        ${sql.join(periodFilters, sql` `)}
    )
  `;
}
