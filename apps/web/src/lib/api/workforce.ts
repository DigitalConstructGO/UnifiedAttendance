import type { z } from "zod";
import type * as service from "@UnifiedAttendance/api/modules/workforce/service";
import type * as validations from "@UnifiedAttendance/api/validations/workforce";

import { apiFetch, type JsonOf } from "./client";

export type Department = JsonOf<Awaited<ReturnType<typeof service.listDepartments>>>[number];
export type Position = JsonOf<Awaited<ReturnType<typeof service.listPositions>>>[number];
export type Cosigner = JsonOf<Awaited<ReturnType<typeof service.listCosigners>>>[number];
export type EmployeeRow = JsonOf<Awaited<ReturnType<typeof service.listEmployees>>>[number];
export type EmployeeWrite = JsonOf<Awaited<ReturnType<typeof service.createEmployee>>>;
export type EmploymentPeriod = JsonOf<
  Awaited<ReturnType<typeof service.listEmploymentPeriods>>
>[number];

export const workforceKeys = {
  departments: ["departments"] as const,
  positions: ["positions"] as const,
  cosigners: ["cosigners"] as const,
  employees: (branchId: string) => ["employees", { branchId }] as const,
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

  employees: (branchId: string, signal?: AbortSignal) =>
    apiFetch<EmployeeRow[]>("/employees", { query: { branchId }, signal }),
  employee: (id: string, signal?: AbortSignal) =>
    apiFetch<EmployeeRow>(`/employees/${id}`, { signal }),
  createEmployee: (input: z.input<typeof validations.createEmployeeInput>) =>
    apiFetch<EmployeeWrite>("/employees", { method: "POST", body: input }),
  updateEmployee: ({ id, ...values }: z.input<typeof validations.updateEmployeeInput>) =>
    apiFetch<EmployeeWrite>(`/employees/${id}`, { method: "PATCH", body: values }),
  employmentPeriods: (employeeId: string, signal?: AbortSignal) =>
    apiFetch<EmploymentPeriod[]>(`/employees/${employeeId}/employment`, { signal }),
  transitionEmployment: (input: z.input<typeof validations.transitionEmploymentInput>) =>
    apiFetch<EmploymentPeriod>(`/employees/${input.employeeId}/employment`, {
      method: "POST",
      body: input,
    }),
};
