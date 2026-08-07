import { z } from "zod";

import { date, id, limit } from "./shared";

export function spanDays(from: string, to: string) {
  const dayMs = 24 * 60 * 60 * 1000;
  return Math.round((Date.parse(`${to}T12:00:00Z`) - Date.parse(`${from}T12:00:00Z`)) / dayMs) + 1;
}

export const SUMMARY_SORTS = [
  "name",
  "lateDays",
  "lateMinutes",
  "absentDays",
  "attendanceRate",
] as const;

export const attendanceSummaryInput = z
  .object({
    from: date,
    to: date,
    branchId: id.optional(),
    departmentId: id.optional(),
    search: z.string().trim().max(120).optional(),
    sort: z.enum(SUMMARY_SORTS).default("name"),
    limit: limit(500, 200),
    offset: z.coerce.number().int().min(0).default(0),
  })
  .refine((value) => value.to >= value.from, {
    message: "'to' must not be before 'from'",
    path: ["to"],
  })
  // A quarter is the largest range one aggregation should carry; longer views
  // belong to the insights report, which groups by month instead of employee.
  .refine((value) => value.to < value.from || spanDays(value.from, value.to) <= 92, {
    message: "Reporting range is capped at 92 days",
    path: ["to"],
  });

export type AttendanceSummaryInput = z.output<typeof attendanceSummaryInput>;
