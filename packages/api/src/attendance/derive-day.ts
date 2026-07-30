import { and, asc, eq, gte, lt } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import {
  attendanceCorrections,
  attendanceDays,
  attendanceEvents,
  manualAttendanceEntries,
} from "@UnifiedAttendance/db/schema/index";

import { loadDayContext } from "./day-context";
import { attendanceOutcome, minutesAfter } from "./day-window";
import { applyCorrections, applyManualEntries, type PunchTimes } from "./overlays";

/** Recomputes one employee-day from events, manual entries, and approved corrections. */
export async function deriveAttendanceDay(options: { employeeId: string; attendanceDate: string }) {
  const { employeeId, attendanceDate } = options;
  const { dayType, dayWindow } = await loadDayContext({ employeeId, attendanceDate });

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

  const manualEntries = await db
    .select()
    .from(manualAttendanceEntries)
    .where(
      and(
        eq(manualAttendanceEntries.employeeId, employeeId),
        eq(manualAttendanceEntries.attendanceDate, attendanceDate),
      ),
    )
    .orderBy(asc(manualAttendanceEntries.createdAt));

  const fromEvents: PunchTimes = {
    firstIn: events.find((event) => event.direction === "in")?.occurredAt ?? null,
    lastOut: [...events].reverse().find((event) => event.direction === "out")?.occurredAt ?? null,
    outcomeOverride: null,
    latenessExcused: false,
  };
  const { firstIn, lastOut, outcomeOverride, latenessExcused } = applyCorrections(
    applyManualEntries(fromEvents, manualEntries),
    corrections,
  );

  const outcome = outcomeOverride ?? attendanceOutcome(firstIn, lastOut, events.length > 0);

  let lateMinutes: number | null = null;
  if (firstIn && dayWindow.expectedStart) {
    lateMinutes = latenessExcused ? 0 : minutesAfter(firstIn, dayWindow.expectedStart);
  }
  const earlyDepartureMinutes =
    lastOut && dayWindow.expectedEnd ? minutesAfter(dayWindow.expectedEnd, lastOut) : null;
  const workedMinutes =
    firstIn && lastOut
      ? Math.max(0, Math.floor((lastOut.getTime() - firstIn.getTime()) / 60_000))
      : null;

  const values = {
    employeeId,
    attendanceDate,
    dayType,
    outcome,
    firstIn,
    lastOut,
    workedMinutes,
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
