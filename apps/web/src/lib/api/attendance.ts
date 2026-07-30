import type { z } from "zod";
import type * as contracts from "@UnifiedAttendance/api/contracts/attendance";
import type * as validations from "@UnifiedAttendance/api/validations/attendance";

import { apiFetch, type JsonOf, type QueryParams } from "./client";

export type AttendanceEvent = JsonOf<contracts.AttendanceEvent>;
export type AttendanceDay = JsonOf<contracts.AttendanceDay>;
export type PushBatch = JsonOf<contracts.AttendancePushBatch>;
export type DailyRegister = JsonOf<contracts.DailyRegister>;
export type ManualAttendanceEntry = JsonOf<contracts.ManualAttendanceEntry>;

type ListEventsQuery = {
  employeeId?: string;
  deviceId?: string;
  from?: string;
  to?: string;
  limit?: number;
};

type ListDaysQuery = { employeeId: string; from?: string; to?: string; limit?: number };

/**
 * A key has to name every input that changes the response, otherwise two
 * different requests share one cache entry — hence the whole query object for
 * the register and the manual-entry list rather than a subset of their fields.
 */
export const attendanceKeys = {
  all: ["attendance"] as const,
  events: (query: ListEventsQuery) => ["attendance", "events", query] as const,
  days: (query: ListDaysQuery) => ["attendance", "days", query] as const,
  pushBatches: (deviceId?: string) => ["attendance", "push-batches", deviceId ?? "all"] as const,
  register: (query: z.input<typeof validations.listDailyRegisterInput>) =>
    ["attendance", "register", query] as const,
  manualEntries: (query: z.input<typeof validations.listManualAttendanceEntriesInput>) =>
    ["attendance", "manual-entries", query] as const,
};

export const attendanceApi = {
  events: (query: ListEventsQuery = {}, signal?: AbortSignal) =>
    apiFetch<AttendanceEvent[]>("/attendance/events", { query: query as QueryParams, signal }),

  days: (query: ListDaysQuery, signal?: AbortSignal) =>
    apiFetch<AttendanceDay[]>("/attendance/days", { query: query as QueryParams, signal }),

  recomputeDay: (input: z.input<typeof validations.recomputeDayInput>) =>
    apiFetch<JsonOf<contracts.AttendanceDay>>("/attendance/days/recompute", {
      method: "POST",
      body: input,
    }),

  pushBatches: (query: { deviceId?: string; limit?: number } = {}, signal?: AbortSignal) =>
    apiFetch<PushBatch[]>("/attendance/push-batches", { query, signal }),

  register: (query: z.input<typeof validations.listDailyRegisterInput>, signal?: AbortSignal) =>
    apiFetch<DailyRegister>("/attendance/register", { query: query as QueryParams, signal }),

  manualEntries: (
    query: z.input<typeof validations.listManualAttendanceEntriesInput>,
    signal?: AbortSignal,
  ) => apiFetch<ManualAttendanceEntry[]>("/attendance/manual-entries", { query, signal }),

  createManualEntry: (input: z.input<typeof validations.createManualAttendanceEntryInput>) =>
    apiFetch<JsonOf<contracts.CreateManualAttendanceEntryResult>>("/attendance/manual-entries", {
      method: "POST",
      body: input,
    }),
};
