import { CalendarCheck, ScrollText } from "lucide-react";

import type { Permission } from "@UnifiedAttendance/api/rbac/permissions";

export type AttendanceSection = "register" | "corrections";

/**
 * Corrections live here rather than under Employees because a correction is an
 * edit to an attendance day: the same branch, the same record, the same people
 * arguing about the same morning. Splitting the two meant leaving the register
 * to fix what the register showed you.
 */
export const ATTENDANCE_SECTIONS = [
  {
    id: "register",
    label: "Register",
    heading: "Daily register",
    description: "Who arrived, who was late, and who is missing — one branch, one day.",
    href: "/dashboard/attendance",
    icon: CalendarCheck,
    permission: "attendance:read",
  },
  {
    id: "corrections",
    label: "Corrections",
    heading: "Attendance corrections",
    description:
      "Ask for a day to be changed when the device got it wrong, and review what others have raised.",
    href: "/dashboard/attendance?section=corrections",
    icon: ScrollText,
    permission: "corrections:read",
  },
] as const satisfies ReadonlyArray<{
  id: AttendanceSection;
  label: string;
  heading: string;
  description: string;
  href: string;
  icon: typeof CalendarCheck;
  permission: Permission;
}>;

export function sectionMeta(section: AttendanceSection) {
  return ATTENDANCE_SECTIONS.find((item) => item.id === section) ?? ATTENDANCE_SECTIONS[0];
}
