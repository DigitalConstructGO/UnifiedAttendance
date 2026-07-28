export const PERMISSIONS = {
  organizationRead: "organization:read",
  organizationManage: "organization:manage",
  workforceRead: "workforce:read",
  workforceManage: "workforce:manage",
  devicesRead: "devices:read",
  devicesManage: "devices:manage",
  attendanceRead: "attendance:read",
  attendanceManage: "attendance:manage",
  correctionsRead: "corrections:read",
  correctionsManage: "corrections:manage",
  correctionsReview: "corrections:review",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export function hasPermission(grantedPermissions: readonly string[], requiredPermission: Permission) {
  return grantedPermissions.includes(requiredPermission);
}

export const ROLES = {
  superAdministrator: "Super Administrator",
  admin: "Admin",
  manager: "Manager",
  hr: "HR",
} as const;

export const FIXED_ROLES = ROLES;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export function isRole(roleName: string): roleName is Role {
  return Object.values(ROLES).includes(roleName as Role);
}

export const isFixedRole = isRole;
