import { DEFAULT_TIME_ZONE } from "./timezone";

function toDate(value: Date | string) {
  if (typeof value !== "string") return value;
  return new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value);
}

export function formatDate(value: Date | string | null | undefined, timeZone = DEFAULT_TIME_ZONE) {
  if (!value) return "—";
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

const RELATIVE_UNITS = [
  { limit: 60, divisor: 1, unit: "second" },
  { limit: 3600, divisor: 60, unit: "minute" },
  { limit: 86400, divisor: 3600, unit: "hour" },
  { limit: 604800, divisor: 86400, unit: "day" },
] as const;

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
  if (!match) return formatDate(date, timeZone);
  const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  return formatter.format(-Math.round(elapsedSeconds / match.divisor), match.unit);
}

export function clockTime(value: Date | string | null | undefined, timeZone = DEFAULT_TIME_ZONE) {
  if (!value) return "";
  const date = toDate(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}
