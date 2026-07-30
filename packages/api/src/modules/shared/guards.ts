import { and, eq, inArray } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import { employees, permissions, rolePermissions, roles, userRoles } from "@UnifiedAttendance/db/schema/index";

import { ROLES, hasPermission, type Permission } from "../../rbac/permissions";
import { forbidden, notFound, unauthorized } from "../../errors";

import type { Context } from "../../context";

function userId(ctx: Context) {
  if (!ctx.session) {
    unauthorized();
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
    forbidden(`Missing permission: ${permission}`);
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
        eq(roles.name, ROLES.superAdministrator),
      ),
    )
    .limit(1);

  if (assignment.length === 0) {
    forbidden("Administrator access required");
  }
}

export async function requireAdministrator(ctx: Context) {
  const assignments = await db.select({ roleName: roles.name }).from(userRoles).innerJoin(roles, eq(userRoles.roleId, roles.id)).where(and(eq(userRoles.userId, userId(ctx)), inArray(roles.name, [ROLES.superAdministrator, ROLES.admin]))).limit(1);
  if (assignments.length === 0) forbidden("Administrator access required");
}

export function requireSessionUser(ctx: Context) {
  return userId(ctx);
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

export { notFound };
