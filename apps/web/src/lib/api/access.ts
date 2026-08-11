import type { z } from "zod";
import type * as contracts from "@UnifiedAttendance/api/contracts/access";
import type * as validations from "@UnifiedAttendance/api/validations/access";

import { apiFetch, type JsonOf } from "./client";

export type MyAccess = JsonOf<contracts.MyAccessEntry[]>;
export type PermissionRecord = JsonOf<contracts.PermissionRecord>;
export type RoleRecord = JsonOf<contracts.RoleRecord>;
export type RoleSummary = JsonOf<contracts.RoleSummary>;
export type RoleAssignment = JsonOf<contracts.RoleAssignment>;
export type RoleGrant = JsonOf<contracts.RoleGrant>;
export type UserAccount = JsonOf<contracts.UserAccount>;
export type RolePermissionGrant = JsonOf<contracts.RolePermissionGrant>;

export const accessKeys = {
  me: ["access", "me"] as const,
  permissions: ["access", "permissions"] as const,
  roles: ["access", "roles"] as const,
  assignments: ["access", "assignments"] as const,
  users: ["access", "users"] as const,
  roleGrants: ["access", "role-permissions"] as const,
};

export const accessApi = {
  me: (signal?: AbortSignal) => apiFetch<MyAccess>("/access/me", { signal }),
  permissions: (signal?: AbortSignal) =>
    apiFetch<PermissionRecord[]>("/access/permissions", { signal }),
  roles: (signal?: AbortSignal) => apiFetch<RoleSummary[]>("/access/roles", { signal }),

  createRole: (input: z.input<typeof validations.createRoleInput>) =>
    apiFetch<RoleRecord>("/access/roles", { method: "POST", body: input }),
  updateRole: (input: z.input<typeof validations.updateRoleInput>) =>
    apiFetch<RoleRecord>(`/access/roles/${input.roleId}`, { method: "PATCH", body: input }),
  archiveRole: (roleId: string) =>
    apiFetch<RoleRecord>(`/access/roles/${roleId}`, { method: "DELETE" }),
  assignments: (signal?: AbortSignal) =>
    apiFetch<RoleAssignment[]>("/access/assignments", { signal }),
  users: (signal?: AbortSignal) => apiFetch<UserAccount[]>("/access/users", { signal }),
  roleGrants: (signal?: AbortSignal) =>
    apiFetch<RolePermissionGrant[]>("/access/role-permissions", { signal }),

  createUser: (input: z.input<typeof validations.createUserInput>) =>
    apiFetch<UserAccount>("/access/users", { method: "POST", body: input }),

  updateRolePermissions: (input: z.input<typeof validations.updateRolePermissionsInput>) =>
    apiFetch<RoleRecord>(`/access/roles/${input.roleId}/permissions`, {
      method: "PUT",
      body: input,
    }),

  assignRole: (input: z.input<typeof validations.assignRoleInput>) =>
    apiFetch<RoleGrant>("/access/assignments", { method: "POST", body: input }),
};
