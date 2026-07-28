export const PERMISSIONS = {
  organizationRead: "organization:read",
  organizationManage: "organization:manage",
  workforceRead: "workforce:read",
  workforceManage: "workforce:manage",
  devicesRead: "devices:read",
  devicesManage: "devices:manage",
  attendanceRead: "attendance:read",
  correctionsRead: "corrections:read",
  correctionsManage: "corrections:manage",
  correctionsReview: "corrections:review",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const FIXED_ROLES = {
  superAdministrator: "Super Administrator",
  admin: "Admin",
  manager: "Manager",
  hr: "HR",
} as const;

export type FixedRole = (typeof FIXED_ROLES)[keyof typeof FIXED_ROLES];

export function isFixedRole(roleName: string): roleName is FixedRole {
  return Object.values(FIXED_ROLES).includes(roleName as FixedRole);
}

export function hasPermission(grantedPermissions: readonly string[], requiredPermission: Permission) {
  return grantedPermissions.includes(requiredPermission);
}
