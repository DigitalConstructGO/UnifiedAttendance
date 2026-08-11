export type ReportPreset = "day" | "week" | "month";
export type ReportRange = { from: string; to: string };

const DAY_MS = 24 * 60 * 60 * 1000;

const at = (date: string) => new Date(`${date}T12:00:00Z`);
const toDate = (value: Date) => value.toISOString().slice(0, 10);

export function shiftDate(date: string, days: number) {
  return toDate(new Date(at(date).getTime() + days * DAY_MS));
}

export function startOfWeekMonday(date: string) {
  return shiftDate(date, -((at(date).getUTCDay() + 6) % 7));
}

export function startOfMonth(date: string) {
  return `${date.slice(0, 7)}-01`;
}

export function endOfMonth(date: string) {
  const anchor = at(startOfMonth(date));
  anchor.setUTCMonth(anchor.getUTCMonth() + 1);
  return shiftDate(toDate(anchor), -1);
}

export function periodFor(preset: ReportPreset, date: string): ReportRange {
  if (preset === "day") return { from: date, to: date };
  if (preset === "week") {
    const from = startOfWeekMonday(date);
    return { from, to: shiftDate(from, 6) };
  }
  return { from: startOfMonth(date), to: endOfMonth(date) };
}

/** The previous/next period of the same shape, keyed off the range start. */
export function shiftPeriod(range: ReportRange, preset: ReportPreset, step: -1 | 1): ReportRange {
  if (preset === "day") return periodFor("day", shiftDate(range.from, step));
  if (preset === "week") return periodFor("week", shiftDate(range.from, step * 7));
  const anchor = at(range.from);
  anchor.setUTCMonth(anchor.getUTCMonth() + step);
  return periodFor("month", toDate(anchor));
}

export function formatRangeLabel(range: ReportRange, preset: ReportPreset) {
  if (preset === "day")
    return new Intl.DateTimeFormat("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      year: "numeric",
      timeZone: "UTC",
    }).format(at(range.from));
  if (preset === "month")
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(at(range.from));
  const day = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
  const year = at(range.to).getUTCFullYear();
  return `${day.format(at(range.from))} – ${day.format(at(range.to))}, ${year}`;
}
