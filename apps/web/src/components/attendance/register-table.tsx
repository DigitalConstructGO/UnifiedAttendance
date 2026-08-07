import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { FILTERS, type RegisterFilter, type RegisterRow } from "./register-model";
import { registerTitle } from "./register-presentation";
import { RegisterTableRow } from "./register-row";

export function RegisterTable({
  date,
  rows,
  total,
  page,
  pageCount,
  pageSize,
  loading,
  filter,
  departmentNames,
  timeZone,
  onFilterChange,
  onSelect,
  onPageChange,
}: {
  date: string;
  rows: RegisterRow[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  loading: boolean;
  filter: RegisterFilter;
  departmentNames: Map<string, string>;
  timeZone: string;
  onFilterChange: (filter: RegisterFilter) => void;
  onSelect: (employeeId: string) => void;
  onPageChange: (page: number) => void;
}) {
  const pageStart = page * pageSize;

  return (
    <Card className="gap-0 rounded-[18px] py-0 shadow-[var(--shadow-card)] ring-border">
      <CardHeader className="border-b border-border px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <CardTitle className="text-strong text-sm font-bold">
            {registerTitle(date, timeZone)}
          </CardTitle>
          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0" aria-label="Attendance filters">
            {FILTERS.map((item) => (
              <Button
                key={item.id}
                size="sm"
                variant={filter === item.id ? "default" : "outline"}
                className="h-8 shrink-0 rounded-[9px] px-3"
                aria-pressed={filter === item.id}
                onClick={() => onFilterChange(item.id)}
              >
                {item.label}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left text-xs">
            <thead className="bg-[var(--surface-subtle)] text-[0.625rem] font-bold tracking-[0.06em] text-muted-foreground uppercase">
              <tr>
                <th className="px-5 py-3">Employee</th>
                <th className="px-4 py-3">Department</th>
                <th className="px-4 py-3">Schedule</th>
                <th className="px-4 py-3">Check-in</th>
                <th className="px-4 py-3">Check-out</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <RegisterTableRow
                  key={row.employee.id}
                  row={row}
                  departmentNames={departmentNames}
                  timeZone={timeZone}
                  onSelect={onSelect}
                />
              ))}
            </tbody>
          </table>
        </div>

        {loading ? (
          <div className="grid min-h-48 place-items-center" role="status">
            <p className="text-xs text-muted-foreground">Loading attendance register…</p>
          </div>
        ) : null}
        {!loading && rows.length === 0 ? (
          <div className="grid min-h-48 place-items-center px-5 text-center">
            <div>
              <p className="text-strong text-sm font-bold">No attendance records found</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Try another filter, date, or branch.
              </p>
            </div>
          </div>
        ) : null}
        {!loading && rows.length > 0 ? (
          <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs text-muted-foreground">
            <span>
              Showing {pageStart + 1}–{pageStart + rows.length} of {total} employees
            </span>
            {pageCount > 1 ? (
              <span className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-[9px] px-3"
                  disabled={page === 0}
                  onClick={() => onPageChange(page - 1)}
                >
                  Previous
                </Button>
                <span className="font-numeric">
                  Page {page + 1} of {pageCount}
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8 rounded-[9px] px-3"
                  disabled={page >= pageCount - 1}
                  onClick={() => onPageChange(page + 1)}
                >
                  Next
                </Button>
              </span>
            ) : null}
          </footer>
        ) : null}
      </CardContent>
    </Card>
  );
}
