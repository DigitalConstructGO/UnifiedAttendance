import type { AttendanceSummaryRow } from "@/lib/api";

function escapeCell(value: string | number) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

/** Downloads rows as a CSV through a transient object URL. Report-agnostic. */
export function exportCsv(
  filename: string,
  header: readonly string[],
  rows: ReadonlyArray<ReadonlyArray<string | number>>,
) {
  const csv = [header, ...rows].map((row) => row.map(escapeCell).join(",")).join("\n");
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export const SUMMARY_CSV_HEADER = [
  "Name",
  "Employee ID",
  "Branch",
  "Department",
  "Expected days",
  "Present",
  "Partial",
  "Late days",
  "Late minutes",
  "Absent",
  "Unrecorded",
  "Missing punches",
  "Worked minutes",
  "Attendance %",
  "Punctuality %",
] as const;

export function summaryCsvRow(row: AttendanceSummaryRow) {
  return [
    `${row.person.firstName} ${row.person.lastName}`,
    row.employee.employeeCode,
    row.branch.name,
    row.department?.name ?? "",
    row.expectedDays,
    row.presentDays,
    row.partialDays,
    row.lateDays,
    row.lateMinutes,
    row.absentDays,
    row.unrecordedDays,
    row.missingPunchDays,
    row.workedMinutes,
    row.attendanceRatePercent,
    row.punctualityRatePercent,
  ];
}
