export const PERMISSION_GROUPS = {
  organization: ["read", "update"],
  branches: ["read", "create", "update", "manage_schedule", "archive", "restore", "delete"],
  holidays: ["read", "create", "update", "delete"],
  departments: ["read", "create", "update", "delete"],
  positions: ["read", "create", "update", "delete"],
  employees: ["read", "create", "update", "archive", "restore", "delete"],
  employment: ["read", "transition"],
  employment_contracts: ["read", "create", "update", "delete"],
  cosigners: ["read", "create", "update", "delete"],
  workforce_documents: ["read", "manage"],
  devices: ["read", "create", "update", "manage_identities"],
  attendance: ["read", "record", "recompute"],
  corrections: ["read", "create", "update", "delete"],
  clients: ["read", "create", "update", "archive", "restore", "delete"],
  client_contacts: ["create", "update", "archive"],
  opportunities: ["create", "update", "move_stage", "convert"],
  projects: ["create", "update", "archive", "restore", "delete"],
  commercial_contracts: ["create", "update", "delete"],
  invoices: ["create", "update", "issue", "void", "delete"],
  payments: ["record"],
  client_documents: ["upload", "delete"],
  client_engagement: ["manage"],
  client_catalogs: ["manage"],
  reports: ["read"],
  dashboard: ["read"],
  notifications: ["manage"],
} as const;

type Groups = typeof PERMISSION_GROUPS;
export type PermissionModule = keyof Groups;
export type Permission = {
  [M in PermissionModule]: `${M & string}.${Groups[M][number]}`;
}[PermissionModule];

function codesOf<M extends PermissionModule>(module: M): Permission[] {
  return PERMISSION_GROUPS[module].map((action) => `${module}.${action}` as Permission);
}

export const PERMISSIONS: readonly Permission[] = (
  Object.keys(PERMISSION_GROUPS) as PermissionModule[]
).flatMap(codesOf);

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

const WORKFORCE_MODULES: PermissionModule[] = [
  "departments",
  "positions",
  "employees",
  "employment",
  "employment_contracts",
  "cosigners",
  "workforce_documents",
];

const CLIENT_MODULES: PermissionModule[] = [
  "clients",
  "client_contacts",
  "opportunities",
  "projects",
  "commercial_contracts",
  "invoices",
  "payments",
  "client_documents",
  "client_engagement",
  "client_catalogs",
];

export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  [ROLES.superAdministrator]: PERMISSIONS,
  [ROLES.admin]: PERMISSIONS,
  [ROLES.hr]: [
    "organization.read",
    "branches.read",
    "holidays.read",
    ...WORKFORCE_MODULES.flatMap(codesOf),
    "attendance.read",
    ...codesOf("corrections"),
    "reports.read",
    "dashboard.read",
    "notifications.manage",
  ],
  [ROLES.manager]: [
    "organization.read",
    "branches.read",
    "holidays.read",
    ...WORKFORCE_MODULES.flatMap(codesOf),
    ...CLIENT_MODULES.flatMap(codesOf),
  ],
};
