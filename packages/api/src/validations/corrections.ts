import { z } from "zod";

import { date, id, text } from "./shared";

const correctionType = z.enum([
  "add_check_in",
  "add_check_out",
  "adjust_check_in",
  "adjust_check_out",
  "mark_absent",
  "mark_present",
  "excuse_lateness",
]);

const timedTypes = ["add_check_in", "add_check_out", "adjust_check_in", "adjust_check_out"];

export const correctionValues = z.object({
  employeeId: id,
  attendanceDate: date,
  type: correctionType,
  disputedEventId: id.nullable().optional(),
  proposedTime: z.coerce.date().nullable().optional(),
  reason: text,
});

export const listCorrectionsInput = z.object({
  employeeId: id,
  status: z.enum(["pending", "approved", "rejected"]).optional(),
});

export const createCorrectionInput = correctionValues.superRefine((input, issue) => {
  if (timedTypes.includes(input.type) && !input.proposedTime) {
    issue.addIssue({
      code: "custom",
      path: ["proposedTime"],
      message: "A proposed time is required for this correction type",
    });
  }
});

export const updateCorrectionInput = z.object({ id, values: correctionValues.partial() });

export const reviewCorrectionInput = z.object({
  id,
  status: z.enum(["approved", "rejected"]),
  reviewNote: text.nullable().optional(),
});

export type ListCorrectionsInput = z.output<typeof listCorrectionsInput>;
export type CreateCorrectionInput = z.output<typeof createCorrectionInput>;
export type UpdateCorrectionInput = z.output<typeof updateCorrectionInput>;
export type ReviewCorrectionInput = z.output<typeof reviewCorrectionInput>;
