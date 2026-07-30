import { PERMISSIONS, isRole, type Permission, type Role } from "@UnifiedAttendance/api/rbac/permissions";

/** What the signed-in user may do, resolved once per page load. */
export type Access = {
  role: Role | null;
  permissions: readonly Permission[];
};

const KNOWN_PERMISSIONS = new Set<string>(Object.values(PERMISSIONS));

/**
 * `access.me` returns one row per granted permission, and a single row with a null
 * permission when the Role grants nothing. Collapse that into one Access.
 *
 * Rows come from the database, so a name or code retired from the catalog can still be
 * sitting in there — anything the application no longer defines is dropped rather than
 * trusted as a live Role or Permission.
 */
export function toAccess(
  rows: readonly { roleName: string; permission: string | null }[],
): Access {
  const [first] = rows;
  if (!first || !isRole(first.roleName)) return { role: null, permissions: [] };

  return {
    role: first.roleName,
    permissions: rows
      .map((row) => row.permission)
      .filter((permission): permission is Permission =>
        permission !== null && KNOWN_PERMISSIONS.has(permission),
      ),
  };
}

export function can(access: Access, permission: Permission) {
  return access.permissions.includes(permission);
}

/**
 * A module is reachable only by the permission that lets you read it. Kept `as const`
 * so each href stays a literal — Next's typed routes reject a widened `string`.
 */
export const DASHBOARD_NAV = [
  { href: "/dashboard/organization", label: "Organization", permission: "organization:read" },
  { href: "/dashboard/workforce", label: "Workforce", permission: "workforce:read" },
  { href: "/dashboard/devices", label: "Devices", permission: "devices:read" },
  { href: "/dashboard/attendance", label: "Attendance", permission: "attendance:read" },
  { href: "/dashboard/corrections", label: "Corrections", permission: "corrections:read" },
] as const satisfies readonly { href: string; label: string; permission: Permission }[];

export type NavItem = (typeof DASHBOARD_NAV)[number];

export function visibleNavItems(access: Access) {
  return DASHBOARD_NAV.filter((item) => {
    if (item.label === "Organization" && access.role === "HR") return false;
    return can(access, item.permission);
  });
}
