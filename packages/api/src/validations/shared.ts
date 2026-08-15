import { z } from "zod";

export const id = z.uuid();
export const nullableText = z.string().trim().min(1).nullable().optional();
export const nullableUrl = z.url().nullable().optional();
export const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
export const time = z.string().regex(/^\d{2}:\d{2}(:\d{2})?$/, "Expected HH:MM");
export const text = z.string().trim().min(1);
export const minutes = z.coerce.number().int().min(0);


export function limit(max: number, fallback: number) {
  return z.coerce.number().int().min(1).max(max).default(fallback);
}
