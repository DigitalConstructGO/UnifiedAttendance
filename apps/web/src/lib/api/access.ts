import type { z } from "zod";
import type * as service from "@UnifiedAttendance/api/modules/access/service";
import type * as validations from "@UnifiedAttendance/api/validations/access";

import { apiFetch, type JsonOf } from "./client";

export type MyAccess = JsonOf<Awaited<ReturnType<typeof service.getMyAccess>>>;
export type PermissionRecord = JsonOf<Awaited<ReturnType<typeof service.listPermissions>>>[number];
export type RoleRecord = JsonOf<Awaited<ReturnType<typeof service.listRoles>>>[number];
export type RoleAssignment = JsonOf<Awaited<ReturnType<typeof service.listAssignments>>>[number];

export const accessKeys = {
  me: ["access", "me"] as const,
  permissions: ["access", "permissions"] as const,
  roles: ["access", "roles"] as const,
  assignments: ["access", "assignments"] as const,
};

export const accessApi = {
  me: (signal?: AbortSignal) => apiFetch<MyAccess>("/access/me", { signal }),
  permissions: (signal?: AbortSignal) =>
    apiFetch<PermissionRecord[]>("/access/permissions", { signal }),
  roles: (signal?: AbortSignal) => apiFetch<RoleRecord[]>("/access/roles", { signal }),
  assignments: (signal?: AbortSignal) =>
    apiFetch<RoleAssignment[]>("/access/assignments", { signal }),

  updateRolePermissions: (input: z.input<typeof validations.updateRolePermissionsInput>) =>
    apiFetch<RoleRecord>(`/access/roles/${input.roleId}/permissions`, {
      method: "PUT",
      body: input,
    }),

  assignRole: (input: z.input<typeof validations.assignRoleInput>) =>
    apiFetch<RoleAssignment>("/access/assignments", { method: "POST", body: input }),
};
