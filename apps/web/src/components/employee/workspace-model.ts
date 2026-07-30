import type { Branch, Department, EmployeeRow, EmploymentPeriod, Position } from "@/lib/api";

export type EmployeeSection = "employees" | "create" | "departments" | "contracts";

export type EmployeeCatalogs = {
  branches: Branch[];
  departments: Department[];
  positions: Position[];
};

export type EmployeeSelection = {
  selected: EmployeeRow | null;
  periods: EmploymentPeriod[];
};
