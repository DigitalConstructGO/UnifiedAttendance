import { CircleCheck, CircleSlash, TriangleAlert } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import {
  DEVICE_OFFLINE_AFTER_MINUTES,
  DEVICE_WARNING_AFTER_MINUTES,
  type DeviceHealth,
} from "@UnifiedAttendance/api/modules/devices/health";

export { deviceHealth } from "@UnifiedAttendance/api/modules/devices/health";
export type { DeviceHealth };

/**
 * Health carries an icon and a word as well as a colour, so the state survives
 * a colour-blind reader and a washed-out screen on a factory floor.
 */
export const DEVICE_HEALTH_META: Record<
  DeviceHealth,
  { label: string; hint: string; icon: LucideIcon; badgeClass: string; dotClass: string }
> = {
  online: {
    label: "Online",
    hint: `Reported within the last ${DEVICE_WARNING_AFTER_MINUTES} minutes.`,
    icon: CircleCheck,
    badgeClass: "bg-success/10 text-success",
    dotClass: "bg-success",
  },
  warning: {
    label: "Quiet",
    hint: `Nothing heard for over ${DEVICE_WARNING_AFTER_MINUTES} minutes. Punches may be stalling.`,
    icon: TriangleAlert,
    badgeClass: "bg-warning/12 text-warning",
    dotClass: "bg-warning",
  },
  offline: {
    label: "Offline",
    hint: `Nothing heard for over ${DEVICE_OFFLINE_AFTER_MINUTES} minutes, or switched off deliberately.`,
    icon: CircleSlash,
    badgeClass: "bg-destructive/10 text-destructive",
    dotClass: "bg-destructive",
  },
};

/** An enrolment with no end date is the one currently in force. */
export function isCurrentEnrolment(identity: { validTo: string | null }) {
  return identity.validTo === null;
}
