import { z } from "zod";

import { id } from "./shared";

const permissionCode = z.string().min(1);

export const updateRolePermissionsInput = z.object({
  roleId: id,
  permissionCodes: z.array(permissionCode),
});

export const assignRoleInput = z.object({
  userId: z.string().min(1),
  roleId: id,
});

const roleName = z.string().trim().min(2).max(60);
const roleCode = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-Z0-9_]{2,40}$/, "Code must be LETTERS_AND_UNDERSCORES");

export const createRoleInput = z.object({
  name: roleName,
  code: roleCode,
  description: z.string().trim().max(300).nullable().optional(),
  permissionCodes: z.array(permissionCode),
});

export const updateRoleInput = z.object({
  roleId: id,
  name: roleName.optional(),
  description: z.string().trim().max(300).nullable().optional(),
});

export const roleIdInput = z.object({ roleId: id });

export const createUserInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
  roleId: id,
});

export type UpdateRolePermissionsInput = z.output<typeof updateRolePermissionsInput>;
export type AssignRoleInput = z.output<typeof assignRoleInput>;
export type CreateUserInput = z.output<typeof createUserInput>;
export type CreateRoleInput = z.output<typeof createRoleInput>;
export type UpdateRoleInput = z.output<typeof updateRoleInput>;
export type RoleIdInput = z.output<typeof roleIdInput>;
