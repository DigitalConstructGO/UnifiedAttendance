import { DEFAULT_TIME_ZONE } from "./timezone";


const ETHIOPIAN_MONTHS = [
  "Meskerem",
  "Tikimt",
  "Hidar",
  "Tahsas",
  "Tir",
  "Yekatit",
  "Megabit",
  "Miazia",
  "Ginbot",
  "Sene",
  "Hamle",
  "Nehase",
  "Pagume",
] as const;

const ERA_SUFFIX = "E.C.";

function ethiopianParts(value: Date, timeZone: string) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-u-ca-ethiopic", {
      timeZone,
      day: "numeric",
      month: "numeric",
      year: "numeric",
    })
      .formatToParts(value)
      .map(({ type, value: part }) => [type, part]),
  );
  return {
    day: Number(parts.day),
    month: Number(parts.month),
    year: Number(parts.year),
  };
}

function toDate(value: Date | string) {
  if (typeof value !== "string") return value;
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value);
}

/** `3 Meskerem 2017 E.C.` — the product's standard date rendering. */
export function ethiopianDate(
  value: Date | string | null | undefined,
  timeZone = DEFAULT_TIME_ZONE,
) {
  if (!value) return "—";
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  const { day, month, year } = ethiopianParts(date, timeZone);
  return `${day} ${ETHIOPIAN_MONTHS[month - 1] ?? month} ${year} ${ERA_SUFFIX}`;
}

/** Year alone, for a founding year that never had a day. */
export function ethiopianYear(
  year: number | null | undefined,
  calendar: string | null | undefined,
) {
  if (year === null || year === undefined) return "—";
  return calendar === "ethiopian" ? `${year} ${ERA_SUFFIX}` : String(year);
}

const RELATIVE_UNITS = [
  { limit: 60, divisor: 1, unit: "second" },
  { limit: 3600, divisor: 60, unit: "minute" },
  { limit: 86400, divisor: 3600, unit: "hour" },
  { limit: 604800, divisor: 86400, unit: "day" },
] as const;

/**
 * `5 hours ago` for anything recent, falling back to the Ethiopian date once a
 * relative phrase stops being more useful than the date itself.
 */
export function relativeTime(
  value: Date | string | null | undefined,
  timeZone = DEFAULT_TIME_ZONE,
  now = new Date(),
) {
  if (!value) return "—";
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  const elapsedSeconds = Math.round((now.getTime() - date.getTime()) / 1000);
  const magnitude = Math.abs(elapsedSeconds);
  const match = RELATIVE_UNITS.find((candidate) => magnitude < candidate.limit);
  if (!match) return ethiopianDate(date, timeZone);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  return formatter.format(-Math.round(elapsedSeconds / match.divisor), match.unit);
}

/** `09:14` in the branch's zone, for audit rows that pair a date with a clock time. */
export function clockTime(value: Date | string | null | undefined, timeZone = DEFAULT_TIME_ZONE) {
  if (!value) return "";
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}
