import type {
  attendanceDays,
  attendanceEvents,
  attendancePushBatches,
  manualAttendanceEntries,
} from "@UnifiedAttendance/db/schema/index";

import type { Employee, EmploymentPeriod, Person } from "./workforce";
import type { RegisterStatus } from "../validations/attendance";

export type AttendanceEvent = typeof attendanceEvents.$inferSelect;
/** A day computed from pure silence is never stored, so it carries no row identity. */
export type AttendanceDay = Omit<typeof attendanceDays.$inferSelect, "id" | "calculatedAt"> & {
  id: string | null;
  calculatedAt: Date | null;
};
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
  counts: Record<RegisterStatus, number>;
  total: number;
};

export type CreateManualAttendanceEntryResult = {
  entry: ManualAttendanceEntry;
  day: AttendanceDay;
};
