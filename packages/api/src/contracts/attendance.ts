import type {
  attendanceDays,
  attendanceEvents,
  attendancePushBatches,
  manualAttendanceEntries,
} from "@UnifiedAttendance/db/schema/index";

import type { Employee, EmploymentPeriod, Person } from "./workforce";

export type AttendanceEvent = typeof attendanceEvents.$inferSelect;
export type AttendanceDay = typeof attendanceDays.$inferSelect;
export type AttendancePushBatch = typeof attendancePushBatches.$inferSelect;
export type ManualAttendanceEntry = typeof manualAttendanceEntries.$inferSelect;

export type DailyRegisterRow = {
  employee: Employee;
  person: Person;
  period: EmploymentPeriod;
  day: AttendanceDay;
};

export type DailyRegister = {
  rows: DailyRegisterRow[];
  total: number;
};

export type CreateManualAttendanceEntryResult = {
  entry: ManualAttendanceEntry;
  day: AttendanceDay;
};
