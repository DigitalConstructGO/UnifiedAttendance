import { and, eq, gte, isNull, lte, or } from "drizzle-orm";

import {
  branches,
  branchWorkingDays,
  employmentPeriods,
  employees,
  holidays,
} from "@UnifiedAttendance/db/schema/index";

import { notFound } from "../errors";
import { branchDayWindow, type DayWindow } from "./day-window";

import type { Context } from "../context";

export type DayContext = {
  dayType: "working_day" | "weekend" | "holiday";
  dayWindow: DayWindow;
};

/**
 * `branch_working_days.weekday` is stored Monday-first, because that is the
 * order the organization screen writes it in (`WEEKDAY_NAMES` starts at
 * Monday). JavaScript's `getUTCDay()` is Sunday-first, so reading it raw shifts
 * every day by one: Friday picks up Saturday's row and reads as a weekend,
 * while Sunday picks up Monday's and marks everybody absent on a working day.
 */
export function mondayFirstWeekday(attendanceDate: string) {
  return (new Date(`${attendanceDate}T00:00:00Z`).getUTCDay() + 6) % 7;
}

export async function loadDayContext(
  ctx: Context,
  options: {
    employeeId: string;
    attendanceDate: string;
  },
): Promise<DayContext> {
  const { employeeId, attendanceDate } = options;
  const weekday = mondayFirstWeekday(attendanceDate);

  const [employee] = await ctx.db
    .select({ branchId: employees.branchId })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  if (!employee) notFound("Employee");

  const [employment] = await ctx.db
    .select()
    .from(employmentPeriods)
    .where(
      and(
        eq(employmentPeriods.employeeId, employeeId),
        lte(employmentPeriods.effectiveFrom, attendanceDate),
        or(
          isNull(employmentPeriods.effectiveTo),
          gte(employmentPeriods.effectiveTo, attendanceDate),
        ),
      ),
    )
    .limit(1);
  const branchId = employment?.branchId ?? employee.branchId;

  const [branch] = await ctx.db
    .select({ timezone: branches.timezone })
    .from(branches)
    .where(eq(branches.id, branchId))
    .limit(1);
  if (!branch) notFound("Branch");

  const [workingDay] = await ctx.db
    .select()
    .from(branchWorkingDays)
    .where(and(eq(branchWorkingDays.branchId, branchId), eq(branchWorkingDays.weekday, weekday)))
    .limit(1);

  const dayWindow = await branchDayWindow(ctx, {
    attendanceDate,
    timezone: branch.timezone,
    openingTime: workingDay?.openingTime ?? null,
    closingTime: workingDay?.closingTime ?? null,
  });

  const [holiday] = await ctx.db
    .select({ id: holidays.id })
    .from(holidays)
    .where(
      and(
        eq(holidays.holidayDate, attendanceDate),
        or(eq(holidays.branchId, branchId), isNull(holidays.branchId)),
      ),
    )
    .limit(1);

  return {
    dayType: holiday ? "holiday" : workingDay?.isWorkingDay ? "working_day" : "weekend",
    dayWindow,
  };
}
