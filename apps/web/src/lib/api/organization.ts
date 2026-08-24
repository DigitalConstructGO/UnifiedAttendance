import type { z } from "zod";
import type * as contracts from "@UnifiedAttendance/api/contracts/organization";
import type * as validations from "@UnifiedAttendance/api/validations/organization";

import { apiFetch, type JsonOf } from "./client";

export type Organization = JsonOf<contracts.Organization> | null;
export type OrganizationLetterhead = {
  name: string;
  logoUrl: string | null;
  tin: string | null;
  address: string | null;
} | null;
export type Branch = JsonOf<contracts.Branch>;
export type WorkingDay = JsonOf<contracts.WorkingDay>;
export type Holiday = JsonOf<contracts.Holiday>;
export type BootstrapResult = JsonOf<contracts.BootstrapResult>;

export const organizationKeys = {
  organization: ["organization"] as const,
  letterhead: ["organization", "letterhead"] as const,
  branchesAll: ["branches"] as const,
  branches: (archived?: boolean) => ["branches", { archived: archived ?? false }] as const,
  branch: (branchId: string) => ["branches", branchId] as const,
  workingDays: (branchId: string) => ["branches", branchId, "working-days"] as const,
  holidays: (branchId?: string | null) => ["holidays", branchId ?? "all"] as const,
};

export const organizationApi = {
  bootstrap: (input: z.input<typeof validations.bootstrapOrganizationInput>) =>
    apiFetch<BootstrapResult>("/setup", { method: "POST", body: input }),
  get: (signal?: AbortSignal) => apiFetch<Organization>("/organization", { signal }),
  letterhead: (signal?: AbortSignal) =>
    apiFetch<OrganizationLetterhead>("/organization/letterhead", { signal }),
  create: (input: z.input<typeof validations.createOrganizationInput>) =>
    apiFetch<Organization>("/organization", { method: "POST", body: input }),
  update: ({ id, ...values }: z.input<typeof validations.updateOrganizationInput>) =>
    apiFetch<Organization>(`/organization/${id}`, { method: "PATCH", body: values }),
  logoUploadParams: ({ id, ...values }: z.input<typeof validations.organizationLogoUploadInput>) =>
    apiFetch<{ uploadUrl: string; uploadFields: Record<string, string> }>(
      `/organization/${id}/logo`,
      { method: "POST", body: values },
    ),

  branches: (archived?: boolean, signal?: AbortSignal) =>
    apiFetch<Branch[]>("/branches", { query: { archived }, signal }),
  branch: (branchId: string, signal?: AbortSignal) =>
    apiFetch<Branch>(`/branches/${branchId}`, { signal }),
  createBranch: (input: z.input<typeof validations.createBranchInput>) =>
    apiFetch<Branch>("/branches", { method: "POST", body: input }),
  updateBranch: ({ branchId, ...values }: z.input<typeof validations.updateBranchInput>) =>
    apiFetch<Branch>(`/branches/${branchId}`, { method: "PATCH", body: values }),
  archiveBranch: (branchId: string) =>
    apiFetch<Branch>(`/branches/${branchId}/archive`, { method: "POST" }),
  restoreBranch: (branchId: string) =>
    apiFetch<Branch>(`/branches/${branchId}/restore`, { method: "POST" }),
  deleteBranch: (branchId: string) =>
    apiFetch<Branch>(`/branches/${branchId}`, { method: "DELETE" }),

  workingDays: (branchId: string, signal?: AbortSignal) =>
    apiFetch<WorkingDay[]>(`/branches/${branchId}/working-days`, { signal }),
  replaceWorkingDays: ({
    branchId,
    ...values
  }: z.input<typeof validations.replaceWorkingDaysInput>) =>
    apiFetch<WorkingDay[]>(`/branches/${branchId}/working-days`, { method: "PUT", body: values }),

  holidays: (branchId?: string | null, signal?: AbortSignal) =>
    apiFetch<Holiday[]>("/holidays", { query: { branchId }, signal }),
  createHoliday: (input: z.input<typeof validations.createHolidayInput>) =>
    apiFetch<Holiday>("/holidays", { method: "POST", body: input }),
  updateHoliday: ({ id, ...values }: z.input<typeof validations.updateHolidayInput>) =>
    apiFetch<Holiday>(`/holidays/${id}`, { method: "PATCH", body: values }),
  deleteHoliday: (id: string) => apiFetch<Holiday>(`/holidays/${id}`, { method: "DELETE" }),
};
