import type {
  cosigners,
  departments,
  employees,
  employmentContracts,
  employmentPeriods,
  people,
  positions,
  workforceDocuments,
} from "@UnifiedAttendance/db/schema/index";

export type Department = typeof departments.$inferSelect;
export type Position = typeof positions.$inferSelect;
export type Cosigner = typeof cosigners.$inferSelect;
export type Person = typeof people.$inferSelect;
export type Employee = typeof employees.$inferSelect;
export type EmploymentPeriod = typeof employmentPeriods.$inferSelect;
export type EmploymentContract = typeof employmentContracts.$inferSelect;
export type WorkforceDocument = typeof workforceDocuments.$inferSelect;

/** Stable employee directory shape exposed by employee read endpoints. */
export type EmployeeRow = {
  employee: Employee;
  person: Person;
  department: Department | null;
  position: Position | null;
};

/** Employee creation writes the identity and its first effective assignment together. */
export type EmployeeWrite = {
  employee: Employee;
  person: Person;
  period: EmploymentPeriod;
};

/** Joined contract record used by the contract table and editor. */
export type EmploymentContractRow = {
  contract: EmploymentContract;
  employee: Employee;
  person: Person;
  period: EmploymentPeriod;
  department: Department | null;
  position: Position | null;
  cosigner: Cosigner;
};
