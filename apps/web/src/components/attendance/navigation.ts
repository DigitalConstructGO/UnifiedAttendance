import { CalendarCheck, ScrollText, UserCheck } from "lucide-react";

import type { Permission } from "@UnifiedAttendance/api/rbac/permissions";

export type AttendanceSection = "register" | "record" | "corrections";

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
    id: "record",
    label: "Record",
    heading: "Record today's attendance",
    description:
      "Check people in and out by hand — for branches that work without a reader, or while one is down.",
    href: "/dashboard/attendance?section=record",
    icon: UserCheck,
    permission: "attendance:manage",
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
