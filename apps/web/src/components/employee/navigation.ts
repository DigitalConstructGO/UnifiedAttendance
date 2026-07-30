import { Building2, FileSignature, UserPlus, UsersRound } from "lucide-react";

import type { EmployeeSection } from "./workspace-model";

export const EMPLOYEE_SECTIONS = [
  {
    id: "employees",
    label: "View employees",
    heading: "Employees",
    description: "Search the directory and review each employee's current assignment.",
    href: "/dashboard/employees?section=employees",
    icon: UsersRound,
    requiresManage: false,
  },
  {
    id: "create",
    label: "Create employee",
    heading: "Create employee",
    description: "Add a person and their initial employment assignment.",
    href: "/dashboard/employees?section=create",
    icon: UserPlus,
    requiresManage: true,
  },
  {
    id: "departments",
    label: "Departments & positions",
    heading: "Departments & positions",
    description: "Maintain the structure used when assigning employees.",
    href: "/dashboard/employees?section=departments",
    icon: Building2,
    requiresManage: true,
  },
  {
    id: "contracts",
    label: "Contracts",
    heading: "Employment contracts",
    description: "Create, sign, and review employee contracts and their cosigners.",
    href: "/dashboard/employees?section=contracts",
    icon: FileSignature,
    requiresManage: false,
  },
] as const;

export function sectionMeta(section: EmployeeSection) {
  return EMPLOYEE_SECTIONS.find((item) => item.id === section)!;
}
