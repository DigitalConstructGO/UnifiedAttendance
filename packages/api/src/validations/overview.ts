import { z } from "zod";

import { date } from "./shared";

export const operationsOverviewInput = z.object({
  date,
  feed: z.coerce.number().int().min(1).max(20).default(6),
});

export type OperationsOverviewInput = z.output<typeof operationsOverviewInput>;
