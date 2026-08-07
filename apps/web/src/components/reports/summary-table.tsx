import { ArrowDown, ArrowUp } from "lucide-react";

import { avatarTone } from "@/components/attendance/register-presentation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TablePagination } from "@/components/table-pagination";
import type { AttendanceSummaryRow } from "@/lib/api";

import { formatRangeLabel, type ReportPreset, type ReportRange } from "./period";

import type { SummarySort } from "./use-attendance-summary";

function rateTone(percent: number) {
  if (percent >= 90) return "text-success";
  if (percent >= 75) return "text-amber-700 dark:text-warning";
  return "text-destructive";
}

export function SummaryTable({
  preset,
  range,
  rows,
  total,
  page,
  pageCount,
  pageSize,
  loading,
  refreshing,
  sort,
  onSortChange,
  onPageChange,
}: {
  preset: ReportPreset;
  range: ReportRange;
  rows: AttendanceSummaryRow[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  loading: boolean;
  refreshing: boolean;
  sort: SummarySort;
  onSortChange: (sort: SummarySort) => void;
  onPageChange: (page: number) => void;
}) {
  const days = preset !== "day";
  const columns: ReadonlyArray<{ label: string; sort?: SummarySort; align?: "right" }> = [
    { label: "Employee", sort: "name" },
    { label: "Branch" },
    { label: "Department" },
    { label: days ? "Expected" : "Scheduled", align: "right" },
    { label: "Present", align: "right" },
    { label: days ? "Late days" : "Late", sort: "lateDays", align: "right" },
    { label: "Late min", sort: "lateMinutes", align: "right" },
    { label: "Absent", sort: "absentDays", align: "right" },
    { label: "Unrecorded", align: "right" },
    { label: "Rate", sort: "attendanceRate", align: "right" },
  ];
  return (
    <Card className="gap-0 rounded-[18px] py-0 shadow-[var(--shadow-card)] ring-border">
      <CardHeader className="border-b border-border px-5 py-4">
        <CardTitle className="text-strong text-sm font-bold">
          Attendance for {formatRangeLabel(range, preset)}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] border-collapse text-left text-xs">
            <thead className="bg-[var(--surface-subtle)] text-[0.625rem] font-bold tracking-[0.06em] text-muted-foreground uppercase">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.label}
                    className={`px-4 py-3 first:px-5 ${column.align === "right" ? "text-right" : ""}`}
                    aria-sort={
                      column.sort === sort
                        ? column.sort === "name" || column.sort === "attendanceRate"
                          ? "ascending"
                          : "descending"
                        : undefined
                    }
                  >
                    {column.sort ? (
                      <button
                        type="button"
                        className="hover:text-strong inline-flex items-center gap-1 uppercase outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        onClick={() => onSortChange(column.sort!)}
                      >
                        {column.label}
                        {column.sort === sort ? (
                          column.sort === "name" || column.sort === "attendanceRate" ? (
                            <ArrowUp className="size-3" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="size-3" aria-hidden="true" />
                          )
                        ) : null}
                      </button>
                    ) : (
                      column.label
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody
              className={refreshing ? "opacity-50 transition-opacity" : "transition-opacity"}
              aria-busy={refreshing}
            >
              {rows.map((row) => {
                const fullName = `${row.person.firstName} ${row.person.lastName}`;
                return (
                  <tr key={row.employee.id} className="border-t border-border hover:bg-muted/40">
                    <td className="px-5 py-3">
                      <span className="flex items-center gap-3">
                        <span
                          className={`grid size-9 shrink-0 place-items-center rounded-[9px] text-xs font-bold ${avatarTone(fullName)}`}
                          aria-hidden="true"
                        >
                          {row.person.firstName[0]}
                          {row.person.lastName[0]}
                        </span>
                        <span className="min-w-0">
                          <span className="text-strong block truncate font-bold">{fullName}</span>
                          <span className="block truncate text-[0.6875rem] text-muted-foreground">
                            {row.employee.employeeCode}
                          </span>
                        </span>
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{row.branch.name}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {row.department?.name ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-numeric">{row.expectedDays}</td>
                    <td className="px-4 py-3 text-right font-numeric font-bold text-success">
                      {row.presentDays + row.partialDays}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-numeric font-bold ${row.lateDays > 0 ? "text-amber-700 dark:text-warning" : "text-muted-foreground"}`}
                    >
                      {row.lateDays}
                    </td>
                    <td className="px-4 py-3 text-right font-numeric text-muted-foreground">
                      {row.lateMinutes}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-numeric font-bold ${row.absentDays > 0 ? "text-destructive" : "text-muted-foreground"}`}
                    >
                      {row.absentDays}
                    </td>
                    <td className="px-4 py-3 text-right font-numeric text-muted-foreground">
                      {row.unrecordedDays}
                    </td>
                    <td
                      className={`px-4 py-3 text-right font-numeric font-bold ${rateTone(row.attendanceRatePercent)}`}
                    >
                      {row.attendanceRatePercent}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {loading ? (
          <div className="grid min-h-48 place-items-center" role="status">
            <p className="text-xs text-muted-foreground">Building the report…</p>
          </div>
        ) : null}
        {!loading && rows.length === 0 ? (
          <div className="grid min-h-48 place-items-center px-5 text-center">
            <div>
              <p className="text-strong text-sm font-bold">Nothing to report</p>
              <p className="mt-1 text-xs text-muted-foreground">
                No employees match this period and filter.
              </p>
            </div>
          </div>
        ) : null}
        {!loading && rows.length > 0 ? (
          <TablePagination
            noun="employees"
            shown={rows.length}
            total={total}
            page={page}
            pageCount={pageCount}
            pageSize={pageSize}
            onPageChange={onPageChange}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}
