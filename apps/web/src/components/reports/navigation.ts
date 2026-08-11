import { ChartColumnBig } from "lucide-react";

import type { Permission } from "@UnifiedAttendance/api/rbac/permissions";

export type ReportsSection = "summary";

export const REPORT_SECTIONS = [
  {
    id: "summary",
    label: "Summary",
    heading: "Attendance summary",
    description:
      "Who was present, late, or absent over any day, week, or month — every branch counted against its own schedule.",
    href: "/dashboard/reports",
    icon: ChartColumnBig,
    permission: "reports.read",
  },
] as const satisfies ReadonlyArray<{
  id: ReportsSection;
  label: string;
  heading: string;
  description: string;
  href: string;
  icon: typeof ChartColumnBig;
  permission: Permission;
}>;

export function sectionMeta(section: ReportsSection) {
  return REPORT_SECTIONS.find((item) => item.id === section) ?? REPORT_SECTIONS[0];
}
