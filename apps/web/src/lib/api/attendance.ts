import type { z } from "zod";
import type * as service from "@UnifiedAttendance/api/modules/attendance/service";
import type * as validations from "@UnifiedAttendance/api/validations/attendance";

import { apiFetch, type JsonOf, type QueryParams } from "./client";

export type AttendanceEvent = JsonOf<Awaited<ReturnType<typeof service.listEvents>>>[number];
export type AttendanceDay = JsonOf<Awaited<ReturnType<typeof service.listDays>>>[number];
export type PushBatch = JsonOf<Awaited<ReturnType<typeof service.listPushBatches>>>[number];

type ListEventsQuery = {
  employeeId?: string;
  deviceId?: string;
  from?: string;
  to?: string;
  limit?: number;
};

type ListDaysQuery = { employeeId: string; from?: string; to?: string; limit?: number };

export const attendanceKeys = {
  events: (query: ListEventsQuery) => ["attendance", "events", query] as const,
  days: (query: ListDaysQuery) => ["attendance", "days", query] as const,
  pushBatches: (deviceId?: string) => ["attendance", "push-batches", deviceId ?? "all"] as const,
};

export const attendanceApi = {
  events: (query: ListEventsQuery = {}, signal?: AbortSignal) =>
    apiFetch<AttendanceEvent[]>("/attendance/events", { query: query as QueryParams, signal }),

  days: (query: ListDaysQuery, signal?: AbortSignal) =>
    apiFetch<AttendanceDay[]>("/attendance/days", { query: query as QueryParams, signal }),

  recomputeDay: (input: z.input<typeof validations.recomputeDayInput>) =>
    apiFetch<Awaited<ReturnType<typeof service.recomputeDay>>>("/attendance/days/recompute", {
      method: "POST",
      body: input,
    }),

  pushBatches: (query: { deviceId?: string; limit?: number } = {}, signal?: AbortSignal) =>
    apiFetch<PushBatch[]>("/attendance/push-batches", { query, signal }),
};
