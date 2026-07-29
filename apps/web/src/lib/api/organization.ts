import type { z } from "zod";
import type * as service from "@UnifiedAttendance/api/modules/organization/service";
import type * as validations from "@UnifiedAttendance/api/validations/organization";

import { apiFetch, type JsonOf } from "./client";

export type Organization = JsonOf<Awaited<ReturnType<typeof service.getOrganization>>>;
export type Branch = JsonOf<Awaited<ReturnType<typeof service.listBranches>>>[number];
export type WorkingDay = JsonOf<Awaited<ReturnType<typeof service.listWorkingDays>>>[number];
export type Holiday = JsonOf<Awaited<ReturnType<typeof service.listHolidays>>>[number];

export const organizationKeys = {
  organization: ["organization"] as const,
  branches: ["branches"] as const,
  branch: (branchId: string) => ["branches", branchId] as const,
  workingDays: (branchId: string) => ["branches", branchId, "working-days"] as const,
  holidays: (branchId?: string | null) => ["holidays", branchId ?? "all"] as const,
};

export const organizationApi = {
  get: (signal?: AbortSignal) => apiFetch<Organization>("/organization", { signal }),
  create: (input: z.input<typeof validations.createOrganizationInput>) =>
    apiFetch<Organization>("/organization", { method: "POST", body: input }),
  update: ({ id, ...values }: z.input<typeof validations.updateOrganizationInput>) =>
    apiFetch<Organization>(`/organization/${id}`, { method: "PATCH", body: values }),

  branches: (signal?: AbortSignal) => apiFetch<Branch[]>("/branches", { signal }),
  branch: (branchId: string, signal?: AbortSignal) => apiFetch<Branch>(`/branches/${branchId}`, { signal }),
  createBranch: (input: z.input<typeof validations.createBranchInput>) =>
    apiFetch<Branch>("/branches", { method: "POST", body: input }),
  updateBranch: ({ branchId, ...values }: z.input<typeof validations.updateBranchInput>) =>
    apiFetch<Branch>(`/branches/${branchId}`, { method: "PATCH", body: values }),

  workingDays: (branchId: string, signal?: AbortSignal) =>
    apiFetch<WorkingDay[]>(`/branches/${branchId}/working-days`, { signal }),
  replaceWorkingDays: ({ branchId, ...values }: z.input<typeof validations.replaceWorkingDaysInput>) =>
    apiFetch<WorkingDay[]>(`/branches/${branchId}/working-days`, { method: "PUT", body: values }),

  holidays: (branchId?: string | null, signal?: AbortSignal) =>
    apiFetch<Holiday[]>("/holidays", { query: { branchId }, signal }),
  createHoliday: (input: z.input<typeof validations.createHolidayInput>) =>
    apiFetch<Holiday>("/holidays", { method: "POST", body: input }),
  updateHoliday: ({ id, ...values }: z.input<typeof validations.updateHolidayInput>) =>
    apiFetch<Holiday>(`/holidays/${id}`, { method: "PATCH", body: values }),
  deleteHoliday: (id: string) => apiFetch<Holiday>(`/holidays/${id}`, { method: "DELETE" }),
};
