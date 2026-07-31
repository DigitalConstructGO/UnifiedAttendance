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
  clientsRead: "clients:read",
  clientsManage: "clients:manage",
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export function hasPermission(
  grantedPermissions: readonly string[],
  requiredPermission: Permission,
) {
  return grantedPermissions.includes(requiredPermission);
}

export const ROLES = {
  superAdministrator: "Super Administrator",
  admin: "Admin",
  manager: "Manager",
  hr: "HR",
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export function isRole(roleName: string): roleName is Role {
  return Object.values(ROLES).includes(roleName as Role);
}

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  [ROLES.superAdministrator]: Object.values(PERMISSIONS),
  [ROLES.admin]: Object.values(PERMISSIONS),
  [ROLES.hr]: [
    "organization:read",
    "workforce:read",
    "workforce:manage",
    "attendance:read",
    "corrections:read",
    "corrections:review",
    "clients:read",
  ],
  [ROLES.manager]: [
    "workforce:read",
    "attendance:read",
    "corrections:read",
    "corrections:review",
    "clients:read",
  ],
};
