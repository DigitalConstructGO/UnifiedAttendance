export const DEVICE_WARNING_AFTER_MINUTES = 15;
export const DEVICE_OFFLINE_AFTER_MINUTES = 60;

export const DEVICE_HEALTHS = ["online", "warning", "offline"] as const;
export type DeviceHealth = (typeof DEVICE_HEALTHS)[number];

/**
 * A reader that has gone quiet is the failure nobody notices: the register
 * still looks plausible while punches stop arriving. Health is derived from
 * when the device last reported, not from what someone typed in the status
 * field, because only one of those two can be wrong without anyone knowing.
 *
 * Pure and shared, so the dashboard and the device list can never disagree
 * about whether the same reader is up.
 */
export function deviceHealth(
  device: { status: string; lastSeenAt: Date | string | null },
  now: Date = new Date(),
): DeviceHealth {
  if (device.status === "inactive") return "offline";
  if (device.lastSeenAt === null) return "offline";
  const minutes = (now.getTime() - new Date(device.lastSeenAt).getTime()) / 60_000;
  if (minutes > DEVICE_OFFLINE_AFTER_MINUTES) return "offline";
  if (minutes > DEVICE_WARNING_AFTER_MINUTES) return "warning";
  return "online";
}
