import { sql } from "drizzle-orm";
import { customType, integer, text } from "drizzle-orm/sqlite-core";

export {
  check,
  foreignKey,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const uuid = (name: string) => text(name);

export const timestamp = (name: string, _options?: { withTimezone?: boolean }) =>
  integer(name, { mode: "timestamp_ms" });

export const now = sql`(cast(unixepoch('subsec') * 1000 as integer))`;

export const date = (name: string) => text(name);

const TIME_24H = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;
const TIME_12H = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp])\.?[Mm]\.?$/;

export function normalizeTime(value: string): string {
  const trimmed = value.trim();
  let hours: number;
  let minutes: string;
  let seconds: string;
  const twelve = TIME_12H.exec(trimmed);
  if (twelve) {
    hours = Number(twelve[1]) % 12;
    if (twelve[4]!.toUpperCase() === "P") hours += 12;
    minutes = twelve[2]!;
    seconds = twelve[3] ?? "00";
  } else {
    const match = TIME_24H.exec(trimmed);
    if (!match) throw new Error(`Invalid time of day: ${value}`);
    hours = Number(match[1]);
    minutes = match[2]!;
    seconds = match[3] ?? "00";
  }
  if (hours > 23 || Number(minutes) > 59 || Number(seconds) > 59) {
    throw new Error(`Invalid time of day: ${value}`);
  }
  return `${String(hours).padStart(2, "0")}:${minutes}:${seconds}`;
}

const timeColumn = customType<{ data: string; driverData: string }>({
  dataType: () => "text",
  toDriver: (value) => normalizeTime(value),
});

export const time = (name: string) => timeColumn(name);

export const numeric = (name: string, options?: { precision?: number; scale?: number }) => {
  const scale = options?.scale ?? 2;
  return customType<{ data: string; driverData: number | string }>({
    dataType: () => "numeric",
    toDriver: (value) => value,
    fromDriver: (value) => Number(value).toFixed(scale),
  })(name);
};

export const jsonb = (name: string) => text(name, { mode: "json" });

export const boolean = (name: string) => integer(name, { mode: "boolean" });

export function sqliteEnum<const T extends readonly [string, ...string[]]>(
  _name: string,
  values: T,
) {
  return (column: string) => text(column, { enum: values });
}
