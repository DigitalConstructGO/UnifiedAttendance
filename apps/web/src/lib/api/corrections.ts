import type { z } from "zod";
import type * as contracts from "@UnifiedAttendance/api/contracts/corrections";
import type * as validations from "@UnifiedAttendance/api/validations/corrections";

import { apiFetch, type JsonOf } from "./client";

export type Correction = JsonOf<contracts.Correction>;

type ListQuery = { employeeId: string; status?: Correction["status"] };

export const correctionsKeys = {
  list: (query: ListQuery) => ["corrections", query] as const,
};

export const correctionsApi = {
  list: (query: ListQuery, signal?: AbortSignal) =>
    apiFetch<Correction[]>("/corrections", { query, signal }),

  create: (input: z.input<typeof validations.createCorrectionInput>) =>
    apiFetch<Correction>("/corrections", { method: "POST", body: input }),

  update: ({ id, values }: z.input<typeof validations.updateCorrectionInput>) =>
    apiFetch<Correction>(`/corrections/${id}`, { method: "PATCH", body: { values } }),

  review: ({ id, ...values }: z.input<typeof validations.reviewCorrectionInput>) =>
    apiFetch<Correction>(`/corrections/${id}/review`, { method: "POST", body: values }),
};
