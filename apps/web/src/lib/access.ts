import { PERMISSIONS, type Permission } from "@UnifiedAttendance/api/rbac/permissions";

export type Access = {
  role: string | null;
  permissions: readonly Permission[];
};

const KNOWN_PERMISSIONS = new Set<string>(PERMISSIONS);

export function toAccess(rows: readonly { roleName: string; permission: string | null }[]): Access {
  const [first] = rows;
  if (!first) return { role: null, permissions: [] };

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
  { href: "/dashboard/attendance", label: "Attendance", permission: "attendance.read" },
  { href: "/dashboard/employees", label: "Employees", permission: "employees.read" },
  { href: "/dashboard/reports", label: "Reports", permission: "reports.read" },
  { href: "/dashboard/clients/overview", label: "Dashboard", permission: "clients.read" },
  { href: "/dashboard/clients", label: "All clients", permission: "clients.read" },
  { href: "/dashboard/clients/pipeline", label: "Leads & pipeline", permission: "clients.read" },
  { href: "/dashboard/clients/contracts", label: "Contracts", permission: "clients.read" },
  { href: "/dashboard/clients/invoices", label: "Invoices", permission: "clients.read" },
  { href: "/dashboard/clients/revenue", label: "Revenue", permission: "clients.read" },
  { href: "/dashboard/devices", label: "Devices", permission: "devices.read" },
  { href: "/dashboard/organization", label: "Organization", permission: "organization.update" },
  {
    href: "/dashboard/notifications",
    label: "Notifications",
    permission: "notifications.manage",
  },
  { href: "/dashboard/access", label: "Users & access", permission: "organization.update" },
] as const satisfies readonly { href: string; label: string; permission: Permission }[];

export type NavItem = (typeof DASHBOARD_NAV)[number];
export type NavLabel = NavItem["label"];

export const NAV_SECTIONS = [
  { label: "Office", items: ["Attendance", "Employees", "Reports"] },
  {
    label: "Clients",
    items: ["Dashboard", "All clients", "Leads & pipeline", "Contracts", "Invoices", "Revenue"],
  },
  { label: "Platform", items: ["Devices", "Organization", "Notifications", "Users & access"] },
] as const satisfies readonly { label: string; items: readonly NavLabel[] }[];

/**
 * Every nav item must be placed in a section. `visibleNavSections` builds the
 * sidebar from NAV_SECTIONS, so an item added to DASHBOARD_NAV but not named
 * here is silently dropped — the route works, the link never appears. This
 * fails the build instead.
 */
type SectionedLabel = (typeof NAV_SECTIONS)[number]["items"][number];
type UnplacedNavLabel = Exclude<NavLabel, SectionedLabel>;
const _everyNavItemIsInASection: UnplacedNavLabel extends never ? true : never = true;

export function visibleNavItems(access: Access) {
  return DASHBOARD_NAV.filter((item) => {
    if (item.label === "Users & access" && access.role !== "Super Administrator") return false;
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
