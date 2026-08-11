import { eq, inArray } from "drizzle-orm";

import {
  permissions,
  rolePermissions,
  roles,
  user,
  userRoles,
} from "@UnifiedAttendance/db/schema/index";
import { auth } from "@UnifiedAttendance/auth";

import { ROLES, isRole } from "../../rbac/permissions";
import { badRequest, conflict, notFound } from "../../errors";
import { withTransaction } from "../../context";
import { requireSessionUser, requireSuperAdmin } from "../shared/guards";

import type {
  AssignRoleInput,
  CreateUserInput,
  UpdateRolePermissionsInput,
} from "../../validations/access";
import type { Context } from "../../context";

const roleNames = Object.values(ROLES);

export function getMyAccess(ctx: Context) {
  const userId = requireSessionUser(ctx);
  return ctx.db
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
  return ctx.db.select().from(permissions).orderBy(permissions.code);
}

export async function listRoles(ctx: Context) {
  await requireSuperAdmin(ctx);
  return ctx.db.select().from(roles).where(inArray(roles.name, roleNames)).orderBy(roles.name);
}

export async function listRoleGrants(ctx: Context) {
  await requireSuperAdmin(ctx);
  return ctx.db
    .select({ roleId: rolePermissions.roleId, permissionCode: permissions.code })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id));
}

export async function updateRolePermissions(ctx: Context, input: UpdateRolePermissionsInput) {
  await requireSuperAdmin(ctx);
  const [role] = await ctx.db.select().from(roles).where(eq(roles.id, input.roleId)).limit(1);
  if (!role || !isRole(role.name)) {
    notFound("Role");
  }

  const selectedPermissions =
    input.permissionCodes.length === 0
      ? []
      : await ctx.db
          .select()
          .from(permissions)
          .where(inArray(permissions.code, input.permissionCodes));
  if (selectedPermissions.length !== input.permissionCodes.length) {
    badRequest("One or more permission codes are not in the seeded catalog");
  }

  await withTransaction(ctx, async (ctx) => {
    await ctx.db.delete(rolePermissions).where(eq(rolePermissions.roleId, role.id));
    if (selectedPermissions.length > 0) {
      await ctx.db.insert(rolePermissions).values(
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
  return ctx.db
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

export async function listUsers(ctx: Context) {
  await requireSuperAdmin(ctx);
  return ctx.db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
      createdAt: user.createdAt,
      roleId: userRoles.roleId,
      roleName: roles.name,
      assignedAt: userRoles.assignedAt,
    })
    .from(user)
    .leftJoin(userRoles, eq(userRoles.userId, user.id))
    .leftJoin(roles, eq(userRoles.roleId, roles.id))
    .orderBy(user.name);
}

export async function createUser(ctx: Context, input: CreateUserInput) {
  await requireSuperAdmin(ctx);
  const assignedBy = requireSessionUser(ctx);

  const [role] = await ctx.db.select().from(roles).where(eq(roles.id, input.roleId)).limit(1);
  if (!role || !isRole(role.name)) {
    notFound("Role");
  }

  const [existing] = await ctx.db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, input.email))
    .limit(1);
  if (existing) {
    conflict("A user with this email already exists");
  }

  const authCtx = await auth.$context;
  const created = await authCtx.internalAdapter.createUser({
    email: input.email,
    name: input.name,
    emailVerified: true,
  });
  await authCtx.internalAdapter.createAccount({
    userId: created.id,
    providerId: "credential",
    accountId: created.id,
    password: await authCtx.password.hash(input.password),
  });

  const [assignment] = await ctx.db
    .insert(userRoles)
    .values({ userId: created.id, roleId: role.id, assignedBy })
    .returning();

  return {
    id: created.id,
    name: created.name,
    email: created.email,
    createdAt: created.createdAt,
    roleId: assignment!.roleId,
    roleName: role.name,
    assignedAt: assignment!.assignedAt,
  };
}

export async function assignRole(ctx: Context, input: AssignRoleInput) {
  await requireSuperAdmin(ctx);
  const [role] = await ctx.db.select().from(roles).where(eq(roles.id, input.roleId)).limit(1);
  if (!role || !isRole(role.name)) {
    notFound("Role");
  }
  const assignedBy = requireSessionUser(ctx);
  const [assignment] = await ctx.db
    .insert(userRoles)
    .values({ userId: input.userId, roleId: role.id, assignedBy })
    .onConflictDoUpdate({
      target: userRoles.userId,
      set: { roleId: role.id, assignedAt: new Date(), assignedBy },
    })
    .returning();
  return assignment;
}
