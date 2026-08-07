import {
  PERMISSIONS,
  isRole,
  type Permission,
  type Role,
} from "@UnifiedAttendance/api/rbac/permissions";

export type Access = {
  role: Role | null;
  permissions: readonly Permission[];
};

const KNOWN_PERMISSIONS = new Set<string>(Object.values(PERMISSIONS));

export function toAccess(rows: readonly { roleName: string; permission: string | null }[]): Access {
  const [first] = rows;
  if (!first || !isRole(first.roleName)) return { role: null, permissions: [] };

  return {
    role: first.roleName,
    permissions: rows
      .map((row) => row.permission)
      .filter(
        (permission): permission is Permission =>
          permission !== null && KNOWN_PERMISSIONS.has(permission),
      ),
  };
}

export function can(access: Access, permission: Permission) {
  return access.permissions.includes(permission);
}

export const DASHBOARD_NAV = [
  { href: "/dashboard/attendance", label: "Attendance", permission: "attendance:read" },
  { href: "/dashboard/employees", label: "Employees", permission: "workforce:read" },
  { href: "/dashboard/reports", label: "Reports", permission: "reports:read" },
  { href: "/dashboard/clients/overview", label: "Dashboard", permission: "clients:read" },
  { href: "/dashboard/clients", label: "All clients", permission: "clients:read" },
  { href: "/dashboard/clients/pipeline", label: "Leads & pipeline", permission: "clients:read" },
  { href: "/dashboard/clients/contracts", label: "Contracts", permission: "clients:read" },
  { href: "/dashboard/clients/invoices", label: "Invoices", permission: "clients:read" },
  { href: "/dashboard/devices", label: "Devices", permission: "devices:read" },
  { href: "/dashboard/organization", label: "Organization", permission: "organization:read" },
] as const satisfies readonly { href: string; label: string; permission: Permission }[];

export type NavItem = (typeof DASHBOARD_NAV)[number];
export type NavLabel = NavItem["label"];

export const NAV_SECTIONS = [
  { label: "Office", items: ["Attendance", "Employees", "Reports"] },
  {
    label: "Clients",
    items: ["Dashboard", "All clients", "Leads & pipeline", "Contracts", "Invoices"],
  },
  { label: "Platform", items: ["Devices", "Organization"] },
] as const satisfies readonly { label: string; items: readonly NavLabel[] }[];

export function visibleNavItems(access: Access) {
  return DASHBOARD_NAV.filter((item) => {
    if (item.label === "Organization" && access.role === "HR") return false;
    return can(access, item.permission);
  });
}

export function visibleNavSections(access: Access) {
  const visible = new Map(visibleNavItems(access).map((item) => [item.label, item] as const));
  return NAV_SECTIONS.map((section) => ({
    label: section.label,
    items: section.items.flatMap((label) => {
      const item = visible.get(label);
      return item ? [item] : [];
    }),
  })).filter((section) => section.items.length > 0);
}
