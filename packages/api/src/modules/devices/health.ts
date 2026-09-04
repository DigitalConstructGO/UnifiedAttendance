export const DEVICE_WARNING_AFTER_MINUTES = 1;
export const DEVICE_OFFLINE_AFTER_MINUTES = 3;

export const DEVICE_HEALTHS = ["online", "warning", "offline"] as const;
export type DeviceHealth = (typeof DEVICE_HEALTHS)[number];

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
