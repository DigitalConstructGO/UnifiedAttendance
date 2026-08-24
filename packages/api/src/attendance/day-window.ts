import type { Context } from "../context";
import { addDays, zonedTimeToUtc } from "../modules/shared/zoned-time";

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

export type DayWindow = {
  dayStart: Date;
  dayEnd: Date;
  expectedStart: Date | null;
  expectedEnd: Date | null;
};

export async function branchDayWindow(
  _ctx: Context,
  options: {
    attendanceDate: string;
    timezone: string;
    openingTime: string | null;
    closingTime: string | null;
  },
): Promise<DayWindow> {
  const { attendanceDate, timezone, openingTime, closingTime } = options;

  return {
    dayStart: zonedTimeToUtc(attendanceDate, "00:00:00", timezone),
    dayEnd: zonedTimeToUtc(addDays(attendanceDate, 1), "00:00:00", timezone),
    expectedStart: openingTime ? zonedTimeToUtc(attendanceDate, openingTime, timezone) : null,
    expectedEnd: closingTime ? zonedTimeToUtc(attendanceDate, closingTime, timezone) : null,
  };
}
