import { and, eq, gte, isNull, lte, or } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import {
  branches,
  branchWorkingDays,
  employmentPeriods,
  employees,
  holidays,
} from "@UnifiedAttendance/db/schema/index";

import { notFound } from "../errors";
import { branchDayWindow, type DayWindow } from "./day-window";

export type DayContext = {
  dayType: "working_day" | "weekend" | "holiday";
  dayWindow: DayWindow;
};

/**
 * Everything about the *day* an employee's punches are judged against: which branch
 * schedule applies on that date, and the absolute instants that bound it.
 */
export async function loadDayContext(options: {
  employeeId: string;
  attendanceDate: string;
}): Promise<DayContext> {
  const { employeeId, attendanceDate } = options;
  const weekday = new Date(`${attendanceDate}T00:00:00Z`).getUTCDay();

  const [employee] = await db
    .select({ branchId: employees.branchId })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  if (!employee) notFound("Employee");

  const [employment] = await db
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
  // Existing installations may have employees created before the backfill migration runs.
  const branchId = employment?.branchId ?? employee.branchId;

  const [branch] = await db
    .select({ timezone: branches.timezone })
    .from(branches)
    .where(eq(branches.id, branchId))
    .limit(1);
  if (!branch) notFound("Branch");

  const [workingDay] = await db
    .select()
    .from(branchWorkingDays)
    .where(and(eq(branchWorkingDays.branchId, branchId), eq(branchWorkingDays.weekday, weekday)))
    .limit(1);

  const dayWindow = await branchDayWindow({
    attendanceDate,
    timezone: branch.timezone,
    openingTime: workingDay?.openingTime ?? null,
    closingTime: workingDay?.closingTime ?? null,
  });

  const [holiday] = await db
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
