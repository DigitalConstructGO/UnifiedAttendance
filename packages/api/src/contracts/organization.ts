import type {
  branches,
  branchWorkingDays,
  holidays,
  organizations,
} from "@UnifiedAttendance/db/schema/index";

export type Organization = typeof organizations.$inferSelect;
export type Branch = typeof branches.$inferSelect;
export type WorkingDay = typeof branchWorkingDays.$inferSelect;
export type Holiday = typeof holidays.$inferSelect;

export type BootstrapResult = {
  organization: Organization;
  branch: Branch;
  days: WorkingDay[];
};
