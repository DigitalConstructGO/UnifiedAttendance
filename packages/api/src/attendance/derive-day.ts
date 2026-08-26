import { and, asc, eq, gte, lt } from "drizzle-orm";

import {
  attendanceCorrections,
  attendanceDays,
  attendanceEvents,
  manualAttendanceEntries,
} from "@UnifiedAttendance/db/schema/index";

import { conflict } from "../errors";
import { loadDayContext } from "./day-context";
import { attendanceOutcome, minutesAfter } from "./day-expectation";
import { applyCorrections, applyManualEntries, type PunchTimes } from "./overlays";

import type { Context } from "../context";

export async function deriveAttendanceDay(
  ctx: Context,
  options: { employeeId: string; attendanceDate: string },
) {
  const { employeeId, attendanceDate } = options;
  const { dayType, dayWindow, graceMinutes } = await loadDayContext(ctx, {
    employeeId,
    attendanceDate,
  });

  const events = await ctx.db
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

  const corrections = await ctx.db
    .select()
    .from(attendanceCorrections)
    .where(
      and(
        eq(attendanceCorrections.employeeId, employeeId),
        eq(attendanceCorrections.attendanceDate, attendanceDate),
      ),
    )
    .orderBy(asc(attendanceCorrections.appliedAt));

  const manualEntries = await ctx.db
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

  if (firstIn && lastOut && lastOut.getTime() < firstIn.getTime()) {
    conflict(
      "This would put the check-in after the day's check-out. " +
        "Undo or dispute the conflicting record first.",
    );
  }

  const shiftInProgress = Boolean(
    dayWindow.expectedEnd && !lastOut && Date.now() < dayWindow.expectedEnd.getTime(),
  );
  const outcome =
    outcomeOverride ?? attendanceOutcome(firstIn, lastOut, events.length > 0, shiftInProgress);

  let lateMinutes: number | null = null;
  if (firstIn && dayWindow.expectedStart) {
    lateMinutes = latenessExcused
      ? 0
      : Math.max(0, minutesAfter(firstIn, dayWindow.expectedStart) - graceMinutes);
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
    hasCorrection: corrections.length > 0,
  } as const;

  if (events.length === 0 && manualEntries.length === 0 && corrections.length === 0) {
    await ctx.db
      .delete(attendanceDays)
      .where(
        and(
          eq(attendanceDays.employeeId, employeeId),
          eq(attendanceDays.attendanceDate, attendanceDate),
        ),
      );
    return { id: null, calculatedAt: null, ...values };
  }

  const [day] = await ctx.db
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
