import type { z } from "zod";
import type * as contracts from "@UnifiedAttendance/api/contracts/corrections";
import type * as service from "@UnifiedAttendance/api";
import type * as validations from "@UnifiedAttendance/api/validations/corrections";

import { apiFetch, type JsonOf } from "./client";

type Returned<T extends (...args: never[]) => unknown> = JsonOf<Awaited<ReturnType<T>>>;

export type Correction = JsonOf<contracts.Correction>;

export type CorrectionRow = Returned<typeof service.listCorrections>[number];

type ListQuery = { employeeId: string };

export const correctionsKeys = {
  list: (query: ListQuery) => ["corrections", query] as const,
};

export const correctionsApi = {
  list: (query: ListQuery, signal?: AbortSignal) =>
    apiFetch<CorrectionRow[]>("/corrections", { query, signal }),

  create: (input: z.input<typeof validations.createCorrectionInput>) =>
    apiFetch<Correction>("/corrections", { method: "POST", body: input }),

  update: ({ id, values }: z.input<typeof validations.updateCorrectionInput>) =>
    apiFetch<Correction>(`/corrections/${id}`, { method: "PATCH", body: { values } }),

  remove: (id: string) => apiFetch<Correction>(`/corrections/${id}`, { method: "DELETE" }),
};
