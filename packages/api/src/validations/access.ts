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

export const createUserInput = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(128),
  roleId: id,
});

export type UpdateRolePermissionsInput = z.output<typeof updateRolePermissionsInput>;
export type AssignRoleInput = z.output<typeof assignRoleInput>;
export type CreateUserInput = z.output<typeof createUserInput>;
