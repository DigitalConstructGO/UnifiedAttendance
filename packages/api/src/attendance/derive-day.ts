import { and, asc, eq, gte, isNull, lt, or, sql } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import {
  attendanceCorrections,
  attendanceDays,
  attendanceEvents,
  branches,
  branchWorkingDays,
  employees,
  holidays,
} from "@UnifiedAttendance/db/schema/index";

function minutesAfter(actual: Date, expected: Date) {
  return Math.max(0, Math.floor((actual.getTime() - expected.getTime()) / 60_000));
}

function attendanceOutcome(firstIn: Date | null, lastOut: Date | null, hasEvents: boolean) {
  if (firstIn && lastOut) return "present";
  if (firstIn || lastOut) return "partial";
  return hasEvents ? "unknown" : "absent";
}

async function branchDayWindow(options: {
  attendanceDate: string;
  timezone: string;
  openingTime: string | null;
  closingTime: string | null;
}) {
  const { attendanceDate, timezone, openingTime, closingTime } = options;

  const { rows } = await db.execute<{
    day_start: number;
    day_end: number;
    expected_start: number | null;
    expected_end: number | null;
  }>(sql`
    select
      extract(epoch from ((${attendanceDate}::date)::timestamp at time zone ${timezone}))::float8
        as day_start,
      extract(epoch from ((${attendanceDate}::date + 1)::timestamp at time zone ${timezone}))::float8
        as day_end,
      case when ${openingTime}::time is null then null
           else extract(epoch from ((${attendanceDate}::date + ${openingTime}::time) at time zone ${timezone}))::float8
      end as expected_start,
      case when ${closingTime}::time is null then null
           else extract(epoch from ((${attendanceDate}::date + ${closingTime}::time) at time zone ${timezone}))::float8
      end as expected_end
  `);

  const row = rows[0];
  if (!row) throw new Error(`Could not resolve ${attendanceDate} in ${timezone}`);

  const instant = (seconds: number | null) => (seconds === null ? null : new Date(seconds * 1000));
  return {
    dayStart: new Date(row.day_start * 1000),
    dayEnd: new Date(row.day_end * 1000),
    expectedStart: instant(row.expected_start),
    expectedEnd: instant(row.expected_end),
  };
}

export async function deriveAttendanceDay(options: { employeeId: string; attendanceDate: string }) {
  const { employeeId, attendanceDate } = options;

  const weekday = new Date(`${attendanceDate}T00:00:00Z`).getUTCDay();

  const [employee] = await db
    .select({ branchId: employees.branchId, timezone: branches.timezone })
    .from(employees)
    .innerJoin(branches, eq(employees.branchId, branches.id))
    .where(eq(employees.id, employeeId))
    .limit(1);
  if (!employee) throw new Error(`Employee ${employeeId} not found`);
  const { branchId } = employee;

  const [workingDay] = await db
    .select()
    .from(branchWorkingDays)
    .where(and(eq(branchWorkingDays.branchId, branchId), eq(branchWorkingDays.weekday, weekday)))
    .limit(1);

  const dayWindow = await branchDayWindow({
    attendanceDate,
    timezone: employee.timezone,
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

  const dayType = holiday ? "holiday" : workingDay?.isWorkingDay ? "working_day" : "weekend";

  const events = await db
    .select()
    .from(attendanceEvents)
    .where(
      and(
        eq(attendanceEvents.employeeId, employeeId),
        gte(attendanceEvents.occurredAt, dayWindow.dayStart),
        lt(attendanceEvents.occurredAt, dayWindow.dayEnd),
      ),
    )
    .orderBy(asc(attendanceEvents.occurredAt));

  const corrections = await db
    .select()
    .from(attendanceCorrections)
    .where(
      and(
        eq(attendanceCorrections.employeeId, employeeId),
        eq(attendanceCorrections.attendanceDate, attendanceDate),
        eq(attendanceCorrections.status, "approved"),
      ),
    )
    .orderBy(asc(attendanceCorrections.reviewedAt));

  let firstIn = events.find((event) => event.direction === "in")?.occurredAt ?? null;
  let lastOut =
    [...events].reverse().find((event) => event.direction === "out")?.occurredAt ?? null;
  let outcomeOverride: "absent" | "present" | null = null;
  let latenessExcused = false;

  for (const correction of corrections) {
    switch (correction.type) {
      case "add_check_in":
      case "adjust_check_in":
        firstIn = correction.proposedTime ?? firstIn;
        outcomeOverride = null;
        break;
      case "add_check_out":
      case "adjust_check_out":
        lastOut = correction.proposedTime ?? lastOut;
        outcomeOverride = null;
        break;
      case "mark_absent":
        firstIn = null;
        lastOut = null;
        outcomeOverride = "absent";
        break;
      case "mark_present":
        outcomeOverride = "present";
        break;
      case "excuse_lateness":
        latenessExcused = true;
        break;
    }
  }

  const outcome = outcomeOverride ?? attendanceOutcome(firstIn, lastOut, events.length > 0);

  let lateMinutes: number | null = null;
  if (firstIn && dayWindow.expectedStart) {
    lateMinutes = latenessExcused ? 0 : minutesAfter(firstIn, dayWindow.expectedStart);
  }
  const earlyDepartureMinutes =
    lastOut && dayWindow.expectedEnd ? minutesAfter(dayWindow.expectedEnd, lastOut) : null;

  const values = {
    employeeId,
    attendanceDate,
    dayType,
    outcome,
    firstIn,
    lastOut,
    lateMinutes,
    earlyDepartureMinutes,
    missingCheckIn: !firstIn,
    missingCheckOut: !lastOut,
    hasApprovedCorrection: corrections.length > 0,
  } as const;

  const [day] = await db
    .insert(attendanceDays)
    .values(values)
    .onConflictDoUpdate({
      target: [attendanceDays.employeeId, attendanceDays.attendanceDate],
      set: { ...values, calculatedAt: new Date() },
    })
    .returning();

  if (!day) throw new Error(`Failed to store the attendance day for ${attendanceDate}`);
  return day;
}
