import { z } from "zod";

import {
  BRANCH_STATUSES,
  DEFAULT_TIME_ZONE,
  ORGANIZATION_STATUSES,
} from "@UnifiedAttendance/db/schema/organization";

import { date, id, nullableText, nullableUrl, text, time } from "./shared";

export const timeZone = z
  .string()
  .trim()
  .min(1)
  .refine(
    (value) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    },
    { message: "Use a valid IANA timezone" },
  );

export const createOrganizationInput = z.object({
  name: text,
  code: text,
  timezone: timeZone.default(DEFAULT_TIME_ZONE),
  logoUrl: nullableUrl,
});

const identifier = z
  .string()
  .trim()
  .min(2)
  .max(20)
  .regex(/^[a-z0-9-]+$/i, "Use 2–20 letters, numbers, or hyphens")
  .transform((value) => value.toUpperCase());

export const bootstrapOrganizationInput = z.object({
  organization: z.object({ name: text, code: identifier }),
  branch: z.object({ name: text, code: identifier, address: text }),
  timezone: timeZone.default(DEFAULT_TIME_ZONE),
  days: z
    .array(
      z.object({
        weekday: z.coerce.number().int().min(0).max(6),
        isWorkingDay: z.boolean(),
        openingTime: time.nullable(),
        closingTime: time.nullable(),
      }),
    )
    .length(7)
    .superRefine((days, context) => {
      if (new Set(days.map((day) => day.weekday)).size !== 7)
        context.addIssue({ code: "custom", message: "Include one entry for each day of the week" });
      for (const day of days)
        if (day.isWorkingDay && (!day.openingTime || !day.closingTime))
          context.addIssue({
            code: "custom",
            message: "Working days need opening and closing times",
          });
    }),
});

export const updateOrganizationInput = z.object({
  id,
  name: text.optional(),
  code: identifier.optional(),
  timezone: timeZone.optional(),
  logoUrl: nullableUrl,
  status: z.enum(ORGANIZATION_STATUSES).optional(),
});

/** Branch routes nest (`/branches/:branchId/working-days`), so every level names the segment alike. */
export const branchIdInput = z.object({ branchId: id });

export const createBranchInput = z.object({
  name: text,
  code: identifier,
  address: nullableText,
  timezone: timeZone.optional(),
});

export const updateBranchInput = z.object({
  branchId: id,
  name: text.optional(),
  code: identifier.optional(),
  address: nullableText,
  timezone: timeZone.optional(),
  status: z.enum(BRANCH_STATUSES).optional(),
});

export const workingDaysInput = z.object({ branchId: id });

export const replaceWorkingDaysInput = z.object({
  branchId: id,
  days: z
    .array(
      z.object({
        weekday: z.coerce.number().int().min(0).max(6),
        isWorkingDay: z.boolean(),
        openingTime: time.nullable().optional(),
        closingTime: time.nullable().optional(),
      }),
    )
    .length(7),
});

export const listHolidaysInput = z.object({ branchId: id.nullable().optional() });

export const createHolidayInput = z.object({
  name: text,
  holidayDate: date,
  branchId: id.nullable().optional(),
});

export const updateHolidayInput = z.object({
  id,
  name: text.optional(),
  holidayDate: date.optional(),
  branchId: id.nullable().optional(),
});

export const holidayIdInput = z.object({ id });

export type CreateOrganizationInput = z.output<typeof createOrganizationInput>;
export type BootstrapOrganizationInput = z.output<typeof bootstrapOrganizationInput>;
export type UpdateOrganizationInput = z.output<typeof updateOrganizationInput>;
export type BranchIdInput = z.output<typeof branchIdInput>;
export type CreateBranchInput = z.output<typeof createBranchInput>;
export type UpdateBranchInput = z.output<typeof updateBranchInput>;
export type WorkingDaysInput = z.output<typeof workingDaysInput>;
export type ReplaceWorkingDaysInput = z.output<typeof replaceWorkingDaysInput>;
export type ListHolidaysInput = z.output<typeof listHolidaysInput>;
export type CreateHolidayInput = z.output<typeof createHolidayInput>;
export type UpdateHolidayInput = z.output<typeof updateHolidayInput>;
export type HolidayIdInput = z.output<typeof holidayIdInput>;
