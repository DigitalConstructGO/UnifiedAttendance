import { addDays, zonedTimeToUtc } from "../modules/shared/zoned-time";

export type DayType = "working_day" | "weekend" | "holiday";

/**
 * What the organisation expected of an employee on one calendar date: the
 * bounds of that date in the branch's zone, and — only on a working day — the
 * shift it was expected to cover.
 *
 * `expectedStart`/`expectedEnd` are null whenever nothing was owed, so lateness
 * and early departure cannot be computed against a day that was never worked.
 */
export type DayExpectation = {
  dayType: DayType;
  holidayName: string | null;
  dayStart: Date;
  dayEnd: Date;
  expectedStart: Date | null;
  expectedEnd: Date | null;
};

export type WorkingDayRule = {
  isWorkingDay: boolean;
  openingTime: string | null;
  closingTime: string | null;
};

/**
 * The UTC instants a branch-local calendar date starts and ends on. Events are
 * stored in UTC while attendance is kept per local date, so every lookup of
 * "that day's punches" needs this conversion.
 */
export function localDayBounds(
  attendanceDate: string,
  timezone: string,
): { dayStart: Date; dayEnd: Date } {
  return {
    dayStart: zonedTimeToUtc(attendanceDate, "00:00:00", timezone),
    dayEnd: zonedTimeToUtc(addDays(attendanceDate, 1), "00:00:00", timezone),
  };
}

/**
 * Pure: the one place the weekly schedule and the holiday calendar are
 * reconciled. A holiday overrides the weekday; a weekday not flagged as worked
 * owes nothing regardless of any times stored against it.
 */
export function dayExpectation(input: {
  attendanceDate: string;
  timezone: string;
  workingDay: WorkingDayRule | null;
  holiday: { name: string } | null;
}): DayExpectation {
  const { attendanceDate, timezone, workingDay, holiday } = input;
  const { dayStart, dayEnd } = localDayBounds(attendanceDate, timezone);

  if (holiday) {
    return {
      dayType: "holiday",
      holidayName: holiday.name,
      dayStart,
      dayEnd,
      expectedStart: null,
      expectedEnd: null,
    };
  }

  if (!workingDay?.isWorkingDay) {
    return {
      dayType: "weekend",
      holidayName: null,
      dayStart,
      dayEnd,
      expectedStart: null,
      expectedEnd: null,
    };
  }

  return {
    dayType: "working_day",
    holidayName: null,
    dayStart,
    dayEnd,
    expectedStart: workingDay.openingTime
      ? zonedTimeToUtc(attendanceDate, workingDay.openingTime, timezone)
      : null,
    expectedEnd: workingDay.closingTime
      ? zonedTimeToUtc(attendanceDate, workingDay.closingTime, timezone)
      : null,
  };
}

export function minutesAfter(actual: Date, expected: Date) {
  return Math.max(0, Math.floor((actual.getTime() - expected.getTime()) / 60_000));
}

export function attendanceOutcome(
  firstIn: Date | null,
  lastOut: Date | null,
  hasEvents: boolean,
  shiftInProgress = false,
) {
  if (firstIn && lastOut) return "present";
  if (firstIn && shiftInProgress) return "present";
  if (firstIn || lastOut) return "partial";
  return hasEvents ? "unknown" : "absent";
}
