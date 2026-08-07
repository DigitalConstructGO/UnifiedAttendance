import type { DailyRegister } from "@/lib/api";

export type RegisterRow = DailyRegister["rows"][number];
export const REGISTER_STATUSES = ["present", "late", "absent", "off_day", "missing_punch"] as const;
export type RegisterStatus = (typeof REGISTER_STATUSES)[number];
export type RegisterFilter = "all" | Exclude<RegisterStatus, "present">;
export const MANUAL_ATTENDANCE_ENTRY_KINDS = [
  "check_in",
  "check_out",
  "mark_present",
  "mark_absent",
] as const;
export type ManualKind = (typeof MANUAL_ATTENDANCE_ENTRY_KINDS)[number];
export type QuickKind = Extract<ManualKind, "check_in" | "check_out">;

export const SUMMARY_STATUSES = REGISTER_STATUSES;

export const FILTERS: ReadonlyArray<{ id: RegisterFilter; label: string }> = [
  { id: "all", label: "All" },
  { id: "late", label: "Late" },
  { id: "absent", label: "Absent" },
  { id: "off_day", label: "Off day" },
  { id: "missing_punch", label: "Missing punch" },
];

export const MANUAL_ENTRY_OPTIONS: ReadonlyArray<{ id: ManualKind; label: string }> = [
  { id: MANUAL_ATTENDANCE_ENTRY_KINDS[0], label: "Check in" },
  { id: MANUAL_ATTENDANCE_ENTRY_KINDS[1], label: "Check out" },
  { id: MANUAL_ATTENDANCE_ENTRY_KINDS[2], label: "Mark present" },
  { id: MANUAL_ATTENDANCE_ENTRY_KINDS[3], label: "Mark absent" },
];

export const EMPTY_COUNTS = Object.fromEntries(
  REGISTER_STATUSES.map((status) => [status, 0]),
) as Record<RegisterStatus, number>;

export function needsTime(kind: ManualKind) {
  return kind === "check_in" || kind === "check_out";
}
