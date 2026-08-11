import { detectedTimeZone } from "@/lib/timezone";
import { employmentScheduleLabel } from "@/lib/workforce-presentation";
import type { EmploymentType } from "@/lib/workforce-presentation";

import type { RegisterRow, RegisterStatus } from "./register-model";

export const STATUS_META = {
  present: {
    label: "Present",
    countClass: "text-success",
    badgeClass: "bg-info/10 text-info",
  },
  late: {
    label: "Late",
    countClass: "text-warning",
    badgeClass: "bg-warning/15 text-amber-700 dark:text-warning",
  },
  absent: {
    label: "Absent",
    countClass: "text-destructive",
    badgeClass: "bg-destructive/10 text-destructive",
  },
  off_day: {
    label: "Off day",
    countClass: "text-workflow",
    badgeClass: "bg-workflow/10 text-workflow",
  },
  missing_punch: {
    label: "Missing punch",
    countClass: "text-strong",
    badgeClass: "bg-muted text-muted-foreground",
  },
} as const satisfies Record<
  RegisterStatus,
  { label: string; countClass: string; badgeClass: string }
>;

const AVATAR_TONES = [
  "bg-workflow/10 text-workflow",
  "bg-info/10 text-info",
  "bg-warning/15 text-amber-700 dark:text-warning",
  "bg-success/10 text-success",
  "bg-destructive/10 text-destructive",
] as const;

export function today(timeZone = detectedTimeZone()) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

export function registerStatus(row: RegisterRow): RegisterStatus {
  if (row.day.dayType !== "working_day" && row.day.outcome === "absent") return "off_day";
  if ((row.day.lateMinutes ?? 0) > 0) return "late";
  if (row.day.outcome === "absent") return "absent";
  if (row.day.outcome === "partial" || row.day.outcome === "unknown") return "missing_punch";
  return "present";
}

export function formatTime(value: string | null, timeZone = detectedTimeZone()) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(value));
}

export function timeInputValue(value: string, timeZone = detectedTimeZone()) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

export function registerTitle(date: string, timeZone = detectedTimeZone()) {
  if (date === today(timeZone)) return "Today's attendance register";
  const label = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
  return `${label} attendance register`;
}

export function scheduleLabel(value: EmploymentType) {
  return employmentScheduleLabel(value);
}

export function avatarTone(name: string) {
  const index = Array.from(name).reduce((total, character) => total + character.charCodeAt(0), 0);
  return AVATAR_TONES[index % AVATAR_TONES.length];
}

export function localDateTimeToIso(date: string, time: string, timeZone: string) {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute, second = 0] = time.split(":").map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute, second, 0);
  let candidate = desired;
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    calendar: "iso8601",
    numberingSystem: "latn",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const parts = Object.fromEntries(
      formatter.formatToParts(new Date(candidate)).map(({ type, value }) => [type, value]),
    );
    const represented = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second),
    );
    const correction = desired - represented;
    candidate += correction;
    if (correction === 0) break;
  }
  return new Date(candidate).toISOString();
}
