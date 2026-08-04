import type * as service from "@UnifiedAttendance/api";

import { apiFetch, type JsonOf } from "./client";

export type OperationsOverview = JsonOf<Awaited<ReturnType<typeof service.getOperationsOverview>>>;

type OverviewQuery = { date: string; feed?: number };

export const overviewKeys = {
  operations: (query: OverviewQuery) => ["overview", query] as const,
};

export const overviewApi = {
  operations: (query: OverviewQuery, signal?: AbortSignal) =>
    apiFetch<OperationsOverview>("/overview", { query, signal }),
};
