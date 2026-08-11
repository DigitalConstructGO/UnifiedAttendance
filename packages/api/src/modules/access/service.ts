import { and, eq, inArray, isNull, sql } from "drizzle-orm";

import {
  permissions,
  rolePermissions,
  roles,
  user,
  userRoles,
} from "@UnifiedAttendance/db/schema/index";
import { auth } from "@UnifiedAttendance/auth";

import { ROLES } from "../../rbac/permissions";
import { badRequest, conflict, notFound } from "../../errors";
import { withTransaction } from "../../context";
import { requireSessionUser, requireSuperAdmin } from "../shared/guards";

import type {
  AssignRoleInput,
  CreateRoleInput,
  CreateUserInput,
  RoleIdInput,
  UpdateRoleInput,
  UpdateRolePermissionsInput,
} from "../../validations/access";
import type { Context } from "../../context";

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
  return ctx.db
    .select({
      id: roles.id,
      name: roles.name,
      code: roles.code,
      description: roles.description,
      isSystem: roles.isSystem,
      createdAt: roles.createdAt,
      permissionCount: sql<number>`count(distinct ${rolePermissions.permissionId})::int`,
      userCount: sql<number>`count(distinct ${userRoles.userId})::int`,
    })
    .from(roles)
    .leftJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .leftJoin(userRoles, eq(userRoles.roleId, roles.id))
    .where(isNull(roles.archivedAt))
    .groupBy(roles.id)
    .orderBy(roles.name);
}

async function grantPermissions(ctx: Context, roleId: string, permissionCodes: string[]) {
  const selected =
    permissionCodes.length === 0
      ? []
      : await ctx.db.select().from(permissions).where(inArray(permissions.code, permissionCodes));
  if (selected.length !== permissionCodes.length) {
    badRequest("One or more permission codes are not in the seeded catalog");
  }
  await ctx.db.delete(rolePermissions).where(eq(rolePermissions.roleId, roleId));
  if (selected.length > 0) {
    await ctx.db
      .insert(rolePermissions)
      .values(selected.map((permission) => ({ roleId, permissionId: permission.id })));
  }
}

export async function createRole(ctx: Context, input: CreateRoleInput) {
  await requireSuperAdmin(ctx);
  const [taken] = await ctx.db
    .select({ id: roles.id })
    .from(roles)
    .where(
      and(
        isNull(roles.archivedAt),
        sql`(${roles.name} = ${input.name} or ${roles.code} = ${input.code})`,
      ),
    )
    .limit(1);
  if (taken) conflict("A role with this name or code already exists");

  return withTransaction(ctx, async (ctx) => {
    const [role] = await ctx.db
      .insert(roles)
      .values({ name: input.name, code: input.code, description: input.description ?? null })
      .returning();
    if (!role) throw new Error("Role creation failed");
    await grantPermissions(ctx, role.id, input.permissionCodes);
    return role;
  });
}

export async function updateRole(ctx: Context, input: UpdateRoleInput) {
  await requireSuperAdmin(ctx);
  const [role] = await ctx.db.select().from(roles).where(eq(roles.id, input.roleId)).limit(1);
  if (!role || role.archivedAt) notFound("Role");
  if (role.isSystem) {
    conflict("System roles cannot be renamed");
  }
  const [updated] = await ctx.db
    .update(roles)
    .set({
      ...(input.name === undefined ? {} : { name: input.name }),
      ...(input.description === undefined ? {} : { description: input.description }),
    })
    .where(eq(roles.id, role.id))
    .returning();
  return updated;
}

export async function archiveRole(ctx: Context, input: RoleIdInput) {
  await requireSuperAdmin(ctx);
  const [role] = await ctx.db.select().from(roles).where(eq(roles.id, input.roleId)).limit(1);
  if (!role || role.archivedAt) notFound("Role");
  if (role.isSystem) {
    conflict("System roles cannot be archived");
  }
  const [assignment] = await ctx.db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .where(eq(userRoles.roleId, role.id))
    .limit(1);
  if (assignment) {
    conflict("People still hold this role; move them to another role first");
  }
  const [archived] = await ctx.db
    .update(roles)
    .set({ archivedAt: new Date() })
    .where(eq(roles.id, role.id))
    .returning();
  return archived;
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
  if (!role || role.archivedAt) {
    notFound("Role");
  }
  // The role that edits the others must never be able to lock itself out.
  if (role.name === ROLES.superAdministrator) {
    conflict("Super Administrator always holds every permission");
  }

  await withTransaction(ctx, async (ctx) => {
    await grantPermissions(ctx, role.id, input.permissionCodes);
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
  if (!role || role.archivedAt) {
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
  if (!role || role.archivedAt) {
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
