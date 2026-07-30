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

export type ListEventsInput = z.output<typeof listEventsInput>;
export type ListDaysInput = z.output<typeof listDaysInput>;
export type RecomputeDayInput = z.output<typeof recomputeDayInput>;
export type ListPushBatchesInput = z.output<typeof listPushBatchesInput>;
