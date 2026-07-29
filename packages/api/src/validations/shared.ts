import { z } from "zod";

/** Field shapes shared by more than one service, so a rule is written once. */
export const id = z.uuid();
export const nullableText = z.string().trim().min(1).nullable().optional();
export const nullableUrl = z.url().nullable().optional();
export const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
export const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Expected HH:MM");
export const text = z.string().trim().min(1);

/**
 * A page size that survives the query string, where every value arrives as text.
 */
export function limit(max: number, fallback: number) {
  return z.coerce.number().int().min(1).max(max).default(fallback);
}
