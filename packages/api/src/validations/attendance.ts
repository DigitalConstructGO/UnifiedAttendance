import { z } from "zod";

import { date, id, limit } from "./shared";

export const listEventsInput = z.object({
  employeeId: id.optional(),
  deviceId: id.optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: limit(200, 50),
});

export const listDaysInput = z.object({
  employeeId: id,
  from: date.optional(),
  to: date.optional(),
  limit: limit(366, 90),
});

export const recomputeDayInput = z.object({ employeeId: id, date });

export const listPushBatchesInput = z.object({
  deviceId: id.optional(),
  limit: limit(200, 50),
});

export const listDailyRegisterInput = z.object({
  branchId: id,
  date,
  departmentId: id.optional(),
  search: z.string().trim().max(120).optional(),
  limit: limit(200, 50),
  offset: z.coerce.number().int().min(0).default(0),
});

export const createManualAttendanceEntryInput = z
  .object({
    employeeId: id,
    attendanceDate: date,
    kind: z.enum(["check_in", "check_out", "mark_present", "mark_absent"]),
    occurredAt: z.coerce.date().optional(),
    reason: z.string().trim().min(3).max(1_000),
  })
  .superRefine((value, issue) => {
    if ((value.kind === "check_in" || value.kind === "check_out") && !value.occurredAt) {
      issue.addIssue({
        code: "custom",
        path: ["occurredAt"],
        message: "A time is required for check-ins and check-outs",
      });
    }
  });

export const listManualAttendanceEntriesInput = z.object({ employeeId: id, date });

export type ListEventsInput = z.output<typeof listEventsInput>;
export type ListDaysInput = z.output<typeof listDaysInput>;
export type RecomputeDayInput = z.output<typeof recomputeDayInput>;
export type ListPushBatchesInput = z.output<typeof listPushBatchesInput>;
export type ListDailyRegisterInput = z.output<typeof listDailyRegisterInput>;
export type CreateManualAttendanceEntryInput = z.output<typeof createManualAttendanceEntryInput>;
export type ListManualAttendanceEntriesInput = z.output<typeof listManualAttendanceEntriesInput>;
