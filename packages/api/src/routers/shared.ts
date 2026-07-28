import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { db } from "@UnifiedAttendance/db";
import { employees, permissions, rolePermissions, roles, userRoles } from "@UnifiedAttendance/db/schema/index";

import { FIXED_ROLES, hasPermission, type Permission } from "../rbac/permissions";

import type { Context } from "../context";

function userId(ctx: Context) {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }
  return ctx.session.user.id;
}

export async function requirePermission(
  ctx: Context,
  permission: Permission,
  _branchId?: string,
) {
  const grantedPermissions = await db
    .select({ code: permissions.code })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(
      and(
        eq(userRoles.userId, userId(ctx)),
      ),
    );

  if (!hasPermission(grantedPermissions.map((grantedPermission) => grantedPermission.code), permission)) {
    throw new TRPCError({ code: "FORBIDDEN", message: `Missing permission: ${permission}` });
  }
}

export async function requireSuperAdmin(ctx: Context) {
  const assignment = await db
    .select({ userId: userRoles.userId })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .where(
      and(
        eq(userRoles.userId, userId(ctx)),
        eq(roles.name, FIXED_ROLES.superAdministrator),
      ),
    )
    .limit(1);

  if (assignment.length === 0) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Super Administrator access required" });
  }
}

export function requireSessionUser(ctx: Context) {
  return userId(ctx);
}

export function notFound(resource: string): never {
  throw new TRPCError({ code: "NOT_FOUND", message: `${resource} not found` });
}

export async function employeeBranchOrThrow(employeeId: string) {
  const [employee] = await db
    .select({ branchId: employees.branchId })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);
  if (!employee) notFound("Employee");
  return employee.branchId;
}
