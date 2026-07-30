import type {
  attendanceDevices,
  employeeDeviceIdentities,
} from "@UnifiedAttendance/db/schema/index";

export type Device = typeof attendanceDevices.$inferSelect;
export type DeviceIdentity = typeof employeeDeviceIdentities.$inferSelect;
