import type { attendanceCorrections } from "@UnifiedAttendance/db/schema/index";

export type Correction = typeof attendanceCorrections.$inferSelect;
