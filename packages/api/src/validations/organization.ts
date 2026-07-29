import { z } from "zod";

import { date, id, nullableText, nullableUrl, text, time } from "./shared";

export const createOrganizationInput = z.object({
  name: text,
  code: text,
  timezone: text.default("Africa/Addis_Ababa"),
  logoUrl: nullableUrl,
});

export const updateOrganizationInput = z.object({
  id,
  name: text.optional(),
  code: text.optional(),
  timezone: text.optional(),
  logoUrl: nullableUrl,
  status: z.enum(["active", "suspended"]).optional(),
});

/** Branch routes nest (`/branches/:branchId/working-days`), so every level names the segment alike. */
export const branchIdInput = z.object({ branchId: id });

export const createBranchInput = z.object({
  name: text,
  code: text,
  address: nullableText,
  timezone: text.optional(),
});

export const updateBranchInput = z.object({
  branchId: id,
  name: text.optional(),
  code: text.optional(),
  address: nullableText,
  timezone: text.optional(),
  status: z.enum(["active", "closed"]).optional(),
});

export const workingDaysInput = z.object({ branchId: id });

export const replaceWorkingDaysInput = z.object({
  branchId: id,
  days: z
    .array(z.object({
      weekday: z.coerce.number().int().min(0).max(6),
      isWorkingDay: z.boolean(),
      openingTime: time.nullable().optional(),
      closingTime: time.nullable().optional(),
    }))
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
