import { sql } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";

export function minutesAfter(actual: Date, expected: Date) {
  return Math.max(0, Math.floor((actual.getTime() - expected.getTime()) / 60_000));
}

export function attendanceOutcome(firstIn: Date | null, lastOut: Date | null, hasEvents: boolean) {
  if (firstIn && lastOut) return "present";
  if (firstIn || lastOut) return "partial";
  return hasEvents ? "unknown" : "absent";
}

export type DayWindow = {
  dayStart: Date;
  dayEnd: Date;
  expectedStart: Date | null;
  expectedEnd: Date | null;
};

/**
 * Resolves a local calendar date into absolute instants using Postgres' own
 * timezone tables, so the boundaries match what the database would compute.
 */
export async function branchDayWindow(options: {
  attendanceDate: string;
  timezone: string;
  openingTime: string | null;
  closingTime: string | null;
}): Promise<DayWindow> {
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
