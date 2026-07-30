import type { EmployeeRow } from "@/lib/api";
import { employmentLabel } from "@/lib/workforce-presentation";

const HEADER = "Name,Employee ID,Department,Position,Employment,Status";

function escapeCell(value: string) {
  return `"${value.replaceAll('"', '""')}"`;
}

function toRow(row: EmployeeRow) {
  return [
    `${row.person.firstName} ${row.person.lastName}`,
    row.employee.employeeCode,
    row.department?.name ?? "",
    row.position?.title ?? "",
    employmentLabel(row.employee.employmentType),
    row.employee.status,
  ]
    .map(escapeCell)
    .join(",");
}

/** Downloads the given employees as `employees.csv` through a transient object URL. */
export function exportEmployees(employees: EmployeeRow[]) {
  const csv = [HEADER, ...employees.map(toRow)].join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "employees.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}
