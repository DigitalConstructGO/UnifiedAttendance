const partsFormatters = new Map<string, Intl.DateTimeFormat>();

function formatter(timeZone: string) {
  let cached = partsFormatters.get(timeZone);
  if (!cached) {
    cached = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    partsFormatters.set(timeZone, cached);
  }
  return cached;
}

export function wallClock(timeZone: string, instant: Date) {
  const fields: Record<string, number> = {};
  for (const part of formatter(timeZone).formatToParts(instant)) {
    if (part.type !== "literal") fields[part.type] = Number(part.value);
  }
  return {
    year: fields.year!,
    month: fields.month!,
    day: fields.day!,
    hour: fields.hour! === 24 ? 0 : fields.hour!,
    minute: fields.minute!,
    second: fields.second!,
  };
}

export function zoneOffsetMinutes(timeZone: string, instant = new Date()): number {
  const w = wallClock(timeZone, instant);
  const asUtc = Date.UTC(w.year, w.month - 1, w.day, w.hour, w.minute, w.second);
  const truncated = Math.floor(instant.getTime() / 1000) * 1000;
  return Math.round((asUtc - truncated) / 60_000);
}

/**
 * The instant at which the wall clock in `timeZone` reads `date` `time`
 * (`YYYY-MM-DD` and `HH:MM[:SS]`). Across a DST gap the later offset wins;
 * in a DST overlap the first occurrence is taken. Neither case arises for
 * zones without DST such as Africa/Addis_Ababa.
 */
export function zonedTimeToUtc(date: string, time: string, timeZone: string): Date {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  const [hh = 0, mm = 0, ss = 0] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm, ss);
  const first = guess - zoneOffsetMinutes(timeZone, new Date(guess)) * 60_000;
  const second = guess - zoneOffsetMinutes(timeZone, new Date(first)) * 60_000;
  return new Date(second);
}

/** `YYYY-MM-DD` shifted by `days` calendar days. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number) as [number, number, number];
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
