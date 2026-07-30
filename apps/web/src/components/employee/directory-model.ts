import type { EmployeeRow } from "@/lib/api";

export const EMPLOYEE_DIRECTORY_PAGE_SIZE = 12;

export function employeeSearchIndex(row: EmployeeRow) {
  return `${row.person.firstName} ${row.person.lastName} ${row.employee.employeeCode} ${row.person.phone ?? ""} ${row.department?.name ?? ""} ${row.position?.title ?? ""}`.toLocaleLowerCase();
}

/** The (at most three) page numbers shown around the current page. */
export function pageOptions(current: number, total: number) {
  if (total <= 3) return Array.from({ length: total }, (_, index) => index + 1);
  if (current <= 2) return [1, 2, 3];
  if (current >= total - 1) return [total - 2, total - 1, total];
  return [current - 1, current, current + 1];
}
