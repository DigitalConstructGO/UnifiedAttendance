import type { permissions, roles, userRoles } from "@UnifiedAttendance/db/schema/index";

export type PermissionRecord = typeof permissions.$inferSelect;
export type RoleRecord = typeof roles.$inferSelect;
export type RoleGrant = typeof userRoles.$inferSelect;

export type MyAccessEntry = {
  roleId: string;
  roleName: string;
  permission: string | null;
};

export type RoleAssignment = RoleGrant & { roleName: string };

export type RolePermissionGrant = { roleId: string; permissionCode: string };

export type UserAccount = {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  roleId: string | null;
  roleName: string | null;
  assignedAt: Date | null;
};
