import { mondayFirstWeekday } from "../../attendance/day-context";

export type WorkingDayFlag = { weekday: number; isWorkingDay: boolean };


export function deriveWeekStartWeekday(workingDays: WorkingDayFlag[]): number {
  const working = Array.from({ length: 7 }, (_, weekday) => {
    const row = workingDays.find((day) => day.weekday === weekday);
    return row ? row.isWorkingDay : true;
  });

  if (working.every(Boolean)) return 0;

  const starts: number[] = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    const predecessor = (weekday + 6) % 7;
    if (working[weekday] && !working[predecessor]) starts.push(weekday);
  }

  if (starts.length === 0) return 0;

  return Math.min(...starts);
}

function parseDateUTC(date: string): Date {
  return new Date(`${date}T00:00:00Z`);
}

function formatDateUTC(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDaysUTC(date: string, days: number): string {
  const parsed = parseDateUTC(date);
  parsed.setUTCDate(parsed.getUTCDate() + days);
  return formatDateUTC(parsed);
}

export type WeekWindow = {
  /** Inclusive. */
  start: string;
  /** Exclusive — the window is `[start, end)`. */
  end: string;
};


export function weekWindowFor(attendanceDate: string, weekStartWeekday: number): WeekWindow {
  const currentWeekday = mondayFirstWeekday(attendanceDate);
  const daysSinceStart = (currentWeekday - weekStartWeekday + 7) % 7;
  const start = addDaysUTC(attendanceDate, -daysSinceStart);
  const end = addDaysUTC(start, 7);
  return { start, end };
}
