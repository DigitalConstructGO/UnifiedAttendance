import { and, eq, like, or } from "drizzle-orm";
import { getHolidaysForYear, HolidayTags, toEC, toGC } from "kenat";

import { DEFAULT_TIME_ZONE, holidays, organizations } from "@UnifiedAttendance/db/schema/index";

import { withTransaction } from "../../context";
import { localBusinessDate } from "../clients/shared";

import type { Context } from "../../context";



export type GeneratedHoliday = {

  key: string;
  name: string;

  holidayDate: string;

  ethiopianDate: string;
};

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function isoDate(parts: { year: number; month: number; day: number }) {
  return `${parts.year}-${pad(parts.month)}-${pad(parts.day)}`;
}


function occurrenceKey(ethiopianYear: number, kenatKey: string, occurrence: number) {
  const suffix = occurrence === 0 ? "" : `#${occurrence + 1}`;
  return `${ethiopianYear}:${kenatKey}${suffix}`;
}


function yearKeyPattern(ethiopianYear: number) {
  return `${ethiopianYear}:%`;
}


export function ethiopianYearOf(gregorianDate: string): number {
  const [year, month, day] = gregorianDate.split("-").map(Number);
  return toEC(year!, month!, day!).year;
}


export function ethiopianPublicHolidays(ethiopianYear: number): GeneratedHoliday[] {
  const seen = new Map<string, number>();
  return getHolidaysForYear(ethiopianYear, { filter: HolidayTags.PUBLIC, lang: "english" })
    .map((holiday) => {
      const { year, month, day } = holiday.ethiopian;
      const gregorian = holiday.gregorian ?? toGC(year, month, day);
      return {
        kenatKey: holiday.key,
        name: holiday.name ?? holiday.key,
        holidayDate: isoDate(gregorian),
        ethiopianDate: isoDate(holiday.ethiopian),
      };
    })
    .sort((a, b) => a.holidayDate.localeCompare(b.holidayDate))
    .map(({ kenatKey, ...holiday }) => {
      const occurrence = seen.get(kenatKey) ?? 0;
      seen.set(kenatKey, occurrence + 1);
      return { key: occurrenceKey(ethiopianYear, kenatKey, occurrence), ...holiday };
    });
}

async function organizationTimezone(ctx: Context) {
  const [organization] = await ctx.db
    .select({ timezone: organizations.timezone })
    .from(organizations)
    .limit(1);
  return organization?.timezone ?? DEFAULT_TIME_ZONE;
}

/** The current Ethiopian year and the next one — what the sync keeps filled. */
export async function ethiopianYearsToCover(ctx: Context): Promise<[number, number]> {
  const today = localBusinessDate(await organizationTimezone(ctx));
  const current = ethiopianYearOf(today);
  return [current, current + 1];
}

export type HolidaySyncResult = { years: number[]; inserted: number; updated: number };


export async function syncEthiopianHolidays(
  ctx: Context,
  options: { years?: number[] } = {},
): Promise<HolidaySyncResult> {
  const years = options.years ?? (await ethiopianYearsToCover(ctx));
  if (years.length === 0) return { years, inserted: 0, updated: 0 };
  const generated = years.flatMap(ethiopianPublicHolidays);

  return withTransaction(ctx, async (tx) => {
    const existing = await tx.db
      .select({
        key: holidays.holidayKey,
        source: holidays.source,
        date: holidays.holidayDate,
        name: holidays.name,
      })
      .from(holidays)
      .where(or(...years.map((year) => like(holidays.holidayKey, yearKeyPattern(year)))));
    const byKey = new Map(existing.map((row) => [row.key, row]));

    let inserted = 0;
    let updated = 0;
    for (const holiday of generated) {
      const current = byKey.get(holiday.key);
      if (!current) {
        inserted += 1;
      } else if (
        current.source === "auto" &&
        (current.date !== holiday.holidayDate || current.name !== holiday.name)
      ) {
        updated += 1;
      }
      await tx.db
        .insert(holidays)
        .values({
          branchId: null,
          name: holiday.name,
          holidayDate: holiday.holidayDate,
          ethiopianDate: holiday.ethiopianDate,
          source: "auto",
          holidayKey: holiday.key,
        })
        .onConflictDoUpdate({
          target: holidays.holidayKey,
          set: {
            name: holiday.name,
            holidayDate: holiday.holidayDate,
            ethiopianDate: holiday.ethiopianDate,
          },
          setWhere: eq(holidays.source, "auto"),
        });
    }
    return { years, inserted, updated };
  });
}


export async function ensureEthiopianHolidays(ctx: Context): Promise<HolidaySyncResult | null> {
  const years = await ethiopianYearsToCover(ctx);
  for (const year of years) {
    const [row] = await ctx.db
      .select({ id: holidays.id })
      .from(holidays)
      .where(and(eq(holidays.source, "auto"), like(holidays.holidayKey, yearKeyPattern(year))))
      .limit(1);
    if (!row) return syncEthiopianHolidays(ctx, { years: [...years] });
  }
  return null;
}
