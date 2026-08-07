import type { z } from "zod";
import type * as service from "@UnifiedAttendance/api";
import type * as validations from "@UnifiedAttendance/api/validations/reports";

import { apiFetch, type JsonOf, type QueryParams } from "./client";

export type AttendanceSummary = JsonOf<Awaited<ReturnType<typeof service.getAttendanceSummary>>>;
export type AttendanceSummaryRow = AttendanceSummary["rows"][number];

type SummaryQuery = z.input<typeof validations.attendanceSummaryInput>;

export const reportKeys = {
  attendanceSummary: (query: SummaryQuery) => ["reports", "attendance-summary", query] as const,
};

export const reportsApi = {
  attendanceSummary: (query: SummaryQuery, signal?: AbortSignal) =>
    apiFetch<AttendanceSummary>("/reports/attendance-summary", {
      query: query as QueryParams,
      signal,
    }),
};
