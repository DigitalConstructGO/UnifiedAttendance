import { and, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";

import {
  branches,
  branchWorkingDays,
  employmentPeriods,
  employees,
  holidays,
} from "@UnifiedAttendance/db/schema/index";

import { notFound } from "../errors";
import { dayExpectation, type DayExpectation, type DayType } from "./day-expectation";

import type { Context } from "../context";

export type DayContext = {
  dayType: DayType;
  dayWindow: Pick<DayExpectation, "dayStart" | "dayEnd" | "expectedStart" | "expectedEnd">;
  graceMinutes: number;
};

export function mondayFirstWeekday(attendanceDate: string) {
  return (new Date(`${attendanceDate}T00:00:00Z`).getUTCDay() + 6) % 7;
}

export async function loadBranchesOnHoliday(
  ctx: Context,
  branchDates: Map<string, string>,
): Promise<Map<string, { name: string }>> {
  const dates = [...new Set(branchDates.values())];
  if (dates.length === 0) return new Map();

  const rows = await ctx.db
    .select({ branchId: holidays.branchId, holidayDate: holidays.holidayDate, name: holidays.name })
    .from(holidays)
    .where(inArray(holidays.holidayDate, dates));

  const onHoliday = new Map<string, { name: string }>();
  for (const [branchId, attendanceDate] of branchDates) {
    const matched = rows.find(
      (row) =>
        row.holidayDate === attendanceDate && (row.branchId === null || row.branchId === branchId),
    );
    if (matched) onHoliday.set(branchId, { name: matched.name });
  }
  return onHoliday;
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
    .select({ timezone: branches.timezone, graceMinutes: branches.graceMinutes })
    .from(branches)
    .where(eq(branches.id, branchId))
    .limit(1);
  if (!branch) notFound("Branch");

  const [workingDay] = await ctx.db
    .select()
    .from(branchWorkingDays)
    .where(and(eq(branchWorkingDays.branchId, branchId), eq(branchWorkingDays.weekday, weekday)))
    .limit(1);

  const [holiday] = await ctx.db
    .select({ name: holidays.name })
    .from(holidays)
    .where(
      and(
        eq(holidays.holidayDate, attendanceDate),
        or(eq(holidays.branchId, branchId), isNull(holidays.branchId)),
      ),
    )
    .limit(1);

  const expectation = dayExpectation({
    attendanceDate,
    timezone: branch.timezone,
    workingDay: workingDay ?? null,
    holiday: holiday ?? null,
  });

  return {
    dayType: expectation.dayType,
    dayWindow: {
      dayStart: expectation.dayStart,
      dayEnd: expectation.dayEnd,
      expectedStart: expectation.expectedStart,
      expectedEnd: expectation.expectedEnd,
    },
    graceMinutes: branch.graceMinutes,
  };
}
