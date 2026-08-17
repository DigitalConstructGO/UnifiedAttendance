import { and, eq, inArray } from "drizzle-orm";

import {
  employees,
  permissions,
  rolePermissions,
  roles,
  userRoles,
} from "@UnifiedAttendance/db/schema/index";

import { ROLES, hasPermission, type Permission } from "../../rbac/permissions";
import { forbidden, notFound, unauthorized } from "../../errors";

import type { Context } from "../../context";

function userId(ctx: Context) {
  if (!ctx.session) {
    unauthorized();
  }
  return ctx.session.user.id;
}

async function loadGrantedPermissions(ctx: Context) {
  const rows = await ctx.db
    .select({ code: permissions.code })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(and(eq(userRoles.userId, userId(ctx))));
  return rows.map((row) => row.code);
}


const GRANT_CACHE_TTL_MS = 60_000;
const grantCache = new Map<string, { permissions: string[]; expiresAt: number }>();

export function forgetGrantedPermissions() {
  grantCache.clear();
}

function grantedPermissionsFor(ctx: Context) {
  const id = userId(ctx);
  const cached = grantCache.get(id);
  if (cached && cached.expiresAt > Date.now()) return Promise.resolve(cached.permissions);
  return loadGrantedPermissions(ctx).then((granted) => {
    grantCache.set(id, { permissions: granted, expiresAt: Date.now() + GRANT_CACHE_TTL_MS });
    return granted;
  });
}

export async function requirePermission(ctx: Context, permission: Permission, _branchId?: string) {
  ctx.grantedPermissions ??= grantedPermissionsFor(ctx);

  let grantedPermissions: string[];
  try {
    grantedPermissions = await ctx.grantedPermissions;
  } catch (error) {
    ctx.grantedPermissions = undefined;
    throw error;
  }

  if (!hasPermission(grantedPermissions, permission)) {
    forbidden(`Missing permission: ${permission}`);
  }
}

export async function isSuperAdmin(ctx: Context) {
  const assignment = await ctx.db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(and(eq(userRoles.userId, userId(ctx)), eq(roles.name, ROLES.superAdministrator)))
    .limit(1);
  return assignment.length > 0;
}

export async function requireSuperAdmin(ctx: Context) {
  if (!(await isSuperAdmin(ctx))) {
    forbidden("Administrator access required");
  }
}

export async function isAdministrator(ctx: Context) {
  const assignments = await ctx.db
    .select({ roleName: roles.name })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(
      and(
        eq(userRoles.userId, userId(ctx)),
        inArray(roles.name, [ROLES.superAdministrator, ROLES.admin]),
      ),
    )
    .limit(1);
  return assignments.length > 0;
}

export async function requireAdministrator(ctx: Context) {
  if (!(await isAdministrator(ctx))) forbidden("Administrator access required");
}

export function requireSessionUser(ctx: Context) {
  return userId(ctx);
}

export async function employeeBranchOrThrow(ctx: Context, employeeId: string) {
  const [employee] = await ctx.db
    .select({ branchId: employees.branchId })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  if (!employee) notFound("Employee");
  return employee.branchId;
}

export { notFound };
