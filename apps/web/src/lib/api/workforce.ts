import type { z } from "zod";
import type * as contracts from "@UnifiedAttendance/api/contracts/workforce";
import type * as validations from "@UnifiedAttendance/api/validations/workforce";
import {
  WORKFORCE_DOCUMENT_CONTENT_TYPES,
  type WorkforceDocumentContentType,
} from "@/lib/workforce-presentation";

import { apiFetch, uploadToStorage, type JsonOf } from "./client";

export type Department = JsonOf<contracts.Department>;
export type Position = JsonOf<contracts.Position>;
export type Cosigner = JsonOf<contracts.Cosigner>;
export type EmploymentContractRow = JsonOf<contracts.EmploymentContractRow>;
export type EmployeeRow = JsonOf<contracts.EmployeeRow>;
export type PersonAssetUrls = {
  profilePhotoUrl: string | null;
};
export type DirectoryEmployeeRow = EmployeeRow & { profilePhotoUrl: string | null };
export type EmployeeProfileRow = EmployeeRow & { personAssets: PersonAssetUrls };
export type EmployeeWrite = JsonOf<contracts.EmployeeWrite>;
export type EmploymentPeriod = JsonOf<contracts.EmploymentPeriod>;
export type WorkforceDocument = JsonOf<contracts.WorkforceDocument>;

type WorkforceDocumentKind = z.input<typeof validations.createWorkforceDocumentInput>["kind"];
type WorkforceDocumentOwner =
  { personId: string } | { cosignerId: string } | { employmentContractId: string };

async function uploadWorkforceDocument(
  owner: WorkforceDocumentOwner,
  kind: WorkforceDocumentKind,
  file: File,
) {
  const contentType = WORKFORCE_DOCUMENT_CONTENT_TYPES.find(
    (value): value is WorkforceDocumentContentType => value === file.type,
  );
  if (!contentType) throw new Error(`${file.name} must be a JPG, PNG, WebP, or PDF file.`);
  const prepared = await apiFetch<{
    document: WorkforceDocument;
    uploadUrl: string;
    uploadFields: Record<string, string>;
  }>("/workforce-documents", {
    method: "POST",
    body: { ...owner, kind, contentType, contentLength: file.size },
  });
  try {
    await uploadToStorage(prepared.uploadUrl, prepared.uploadFields, file);
    return await apiFetch<WorkforceDocument>(`/workforce-documents/${prepared.document.id}`, {
      method: "PATCH",
    });
  } catch (cause) {
    await apiFetch(`/workforce-documents/${prepared.document.id}`, { method: "DELETE" }).catch(
      () => undefined,
    );
    throw cause;
  }
}

export const workforceKeys = {
  departments: ["departments"] as const,
  positions: ["positions"] as const,
  cosigners: ["cosigners"] as const,
  contracts: ["employment-contracts"] as const,
  employmentContracts: (employeeId?: string) =>
    ["employment-contracts", employeeId ?? "all"] as const,
  employeesAll: ["employees"] as const,
  employees: (branchId: string) => ["employees", { branchId }] as const,
  archivedEmployees: (branchId: string) => ["employees", { branchId, archived: true }] as const,
  employee: (id: string) => ["employees", id] as const,
  employmentPeriods: (id: string) => ["employees", id, "employment-periods"] as const,
};

export const workforceApi = {
  departments: (signal?: AbortSignal) => apiFetch<Department[]>("/departments", { signal }),
  createDepartment: (input: z.input<typeof validations.createDepartmentInput>) =>
    apiFetch<Department>("/departments", { method: "POST", body: input }),
  updateDepartment: ({ id, ...values }: z.input<typeof validations.updateDepartmentInput>) =>
    apiFetch<Department>(`/departments/${id}`, { method: "PATCH", body: values }),
  deleteDepartment: (id: string) =>
    apiFetch<Department>(`/departments/${id}`, { method: "DELETE" }),

  positions: (signal?: AbortSignal) => apiFetch<Position[]>("/positions", { signal }),
  createPosition: (input: z.input<typeof validations.createPositionInput>) =>
    apiFetch<Position>("/positions", { method: "POST", body: input }),
  updatePosition: ({ id, ...values }: z.input<typeof validations.updatePositionInput>) =>
    apiFetch<Position>(`/positions/${id}`, { method: "PATCH", body: values }),
  deletePosition: (id: string) => apiFetch<Position>(`/positions/${id}`, { method: "DELETE" }),

  cosigners: (signal?: AbortSignal) => apiFetch<Cosigner[]>("/cosigners", { signal }),
  createCosigner: (input: z.input<typeof validations.createCosignerInput>) =>
    apiFetch<Cosigner>("/cosigners", { method: "POST", body: input }),
  updateCosigner: ({ id, ...values }: z.input<typeof validations.updateCosignerInput>) =>
    apiFetch<Cosigner>(`/cosigners/${id}`, { method: "PATCH", body: values }),
  deleteCosigner: (id: string) => apiFetch<Cosigner>(`/cosigners/${id}`, { method: "DELETE" }),

  employmentContracts: (employeeId?: string, signal?: AbortSignal) =>
    apiFetch<EmploymentContractRow[]>("/employment-contracts", {
      query: { employeeId },
      signal,
    }),
  createEmploymentContract: (input: z.input<typeof validations.createEmploymentContractInput>) =>
    apiFetch<EmploymentContractRow>("/employment-contracts", { method: "POST", body: input }),
  updateEmploymentContract: ({
    id,
    ...values
  }: z.input<typeof validations.updateEmploymentContractInput>) =>
    apiFetch<EmploymentContractRow>(`/employment-contracts/${id}`, {
      method: "PATCH",
      body: values,
    }),
  deleteEmploymentContract: (id: string) =>
    apiFetch<EmploymentContractRow["contract"]>(`/employment-contracts/${id}`, {
      method: "DELETE",
    }),

  uploadDocument: uploadWorkforceDocument,

  employees: (branchId: string, signal?: AbortSignal) =>
    apiFetch<DirectoryEmployeeRow[]>("/employees", { query: { branchId }, signal }),
  archivedEmployees: (branchId: string, signal?: AbortSignal) =>
    apiFetch<DirectoryEmployeeRow[]>("/employees", {
      query: { branchId, archived: "true" },
      signal,
    }),
  archiveEmployee: (id: string) =>
    apiFetch<EmployeeRow["employee"]>(`/employees/${id}/archive`, { method: "POST" }),
  restoreEmployee: (id: string) =>
    apiFetch<EmployeeRow["employee"]>(`/employees/${id}/restore`, { method: "POST" }),
  employee: (id: string, signal?: AbortSignal) =>
    apiFetch<EmployeeProfileRow>(`/employees/${id}`, { signal }),
  createEmployee: (input: z.input<typeof validations.createEmployeeInput>) =>
    apiFetch<EmployeeWrite>("/employees", { method: "POST", body: input }),
  updateEmployee: ({ id, ...values }: z.input<typeof validations.updateEmployeeInput>) =>
    apiFetch<EmployeeWrite>(`/employees/${id}`, { method: "PATCH", body: values }),
  deleteEmployee: (id: string) => apiFetch<EmployeeRow>(`/employees/${id}`, { method: "DELETE" }),
  employmentPeriods: (employeeId: string, signal?: AbortSignal) =>
    apiFetch<EmploymentPeriod[]>(`/employees/${employeeId}/employment`, { signal }),
  transitionEmployment: (input: z.input<typeof validations.transitionEmploymentInput>) =>
    apiFetch<EmploymentPeriod>(`/employees/${input.employeeId}/employment`, {
      method: "POST",
      body: input,
    }),
};
