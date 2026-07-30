import { eq, inArray } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import { permissions, rolePermissions, roles, userRoles } from "@UnifiedAttendance/db/schema/index";

import { ROLES, isRole } from "../../rbac/permissions";
import { badRequest, notFound } from "../../errors";
import { requireSessionUser, requireSuperAdmin } from "../shared/guards";

import type { AssignRoleInput, UpdateRolePermissionsInput } from "../../validations/access";
import type { Context } from "../../context";

const roleNames = Object.values(ROLES);

/** Every role/permission pair the caller holds — the raw material for the UI's access map. */
export function getMyAccess(ctx: Context) {
  const userId = requireSessionUser(ctx);
  return db
    .select({
      roleId: roles.id,
      roleName: roles.name,
      permission: permissions.code,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .leftJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(userRoles.userId, userId));
}

export async function listPermissions(ctx: Context) {
  await requireSuperAdmin(ctx);
  return db.select().from(permissions).orderBy(permissions.code);
}

export async function listRoles(ctx: Context) {
  await requireSuperAdmin(ctx);
  return db.select().from(roles).where(inArray(roles.name, roleNames)).orderBy(roles.name);
}

export async function updateRolePermissions(ctx: Context, input: UpdateRolePermissionsInput) {
  await requireSuperAdmin(ctx);
  const [role] = await db.select().from(roles).where(eq(roles.id, input.roleId)).limit(1);
  if (!role || !isRole(role.name)) {
    notFound("Role");
  }

  const selectedPermissions =
    input.permissionCodes.length === 0
      ? []
      : await db.select().from(permissions).where(inArray(permissions.code, input.permissionCodes));
  if (selectedPermissions.length !== input.permissionCodes.length) {
    badRequest("One or more permission codes are not in the seeded catalog");
  }

  await db.transaction(async (tx) => {
    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id));
    if (selectedPermissions.length > 0) {
      await tx.insert(rolePermissions).values(
        selectedPermissions.map((permission) => ({
          roleId: role.id,
          permissionId: permission.id,
        })),
      );
    }
  });
  return role;
}

export async function listAssignments(ctx: Context) {
  await requireSuperAdmin(ctx);
  return db
    .select({
      userId: userRoles.userId,
      roleId: userRoles.roleId,
      roleName: roles.name,
      assignedAt: userRoles.assignedAt,
      assignedBy: userRoles.assignedBy,
    })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id));
}

export async function assignRole(ctx: Context, input: AssignRoleInput) {
  await requireSuperAdmin(ctx);
  const [role] = await db.select().from(roles).where(eq(roles.id, input.roleId)).limit(1);
  if (!role || !isRole(role.name)) {
    notFound("Role");
  }
  const assignedBy = requireSessionUser(ctx);
  const [assignment] = await db
    .insert(userRoles)
    .values({ userId: input.userId, roleId: role.id, assignedBy })
    .onConflictDoUpdate({
      target: userRoles.userId,
      set: { roleId: role.id, assignedAt: new Date(), assignedBy },
    })
    .returning();
  return assignment;
}
