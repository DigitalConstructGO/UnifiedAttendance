import { Fingerprint, Router } from "lucide-react";

export type DeviceSection = "readers" | "enrolments";

/**
 * A punch only becomes attendance when both halves exist: a reader that
 * reports, and a badge number tied to a person. Splitting them is what the two
 * sections are for — one answers "is the hardware talking", the other "does
 * this badge belong to anyone".
 */
export const DEVICE_SECTIONS = [
  {
    id: "readers",
    label: "Readers",
    heading: "Attendance readers",
    description: "The biometric devices installed at each branch, and whether they are reporting.",
    href: "/dashboard/devices",
    icon: Router,
  },
  {
    id: "enrolments",
    label: "Enrolments",
    heading: "Badge enrolments",
    description: "The badge number each employee punches with, and when it was in force.",
    href: "/dashboard/devices?section=enrolments",
    icon: Fingerprint,
  },
] as const satisfies ReadonlyArray<{
  id: DeviceSection;
  label: string;
  heading: string;
  description: string;
  href: string;
  icon: typeof Router;
}>;

export function sectionMeta(section: DeviceSection) {
  return DEVICE_SECTIONS.find((item) => item.id === section) ?? DEVICE_SECTIONS[0];
}
