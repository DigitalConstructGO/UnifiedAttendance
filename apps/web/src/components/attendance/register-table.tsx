import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TablePagination } from "@/components/table-pagination";

import { FILTERS, type RegisterFilter, type RegisterRow } from "./register-model";
import {
  avatarTone,
  formatTime,
  registerStatus,
  registerTitle,
  scheduleLabel,
  STATUS_META,
} from "./register-presentation";
import { RegisterTableRow } from "./register-row";

function checkInClass(row: RegisterRow, isLate: boolean) {
  if (isLate) return "text-amber-700 dark:text-warning";
  return row.day.firstIn ? "text-info" : "text-muted-foreground";
}

function RegisterCard({
  row,
  departmentNames,
  timeZone,
  onSelect,
}: {
  row: RegisterRow;
  departmentNames: Map<string, string>;
  timeZone: string;
  onSelect: (employeeId: string) => void;
}) {
  const status = registerStatus(row);
  const meta = STATUS_META[status];
  const fullName = `${row.person.firstName} ${row.person.lastName}`;
  const department = row.period.departmentId
    ? (departmentNames.get(row.period.departmentId) ?? "Department unavailable")
    : "—";

  return (
    <li className="border-b border-border last:border-b-0">
      <button
        type="button"
        className="flex w-full flex-col gap-3 px-5 py-4 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onClick={() => onSelect(row.employee.id)}
        aria-label={`Inspect attendance for ${fullName}`}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span
              className={`grid size-9 shrink-0 place-items-center rounded-[9px] text-xs font-bold ${avatarTone(fullName)}`}
              aria-hidden="true"
            >
              {row.person.firstName[0]}
              {row.person.lastName[0]}
            </span>
            <div className="min-w-0">
              <p className="text-strong truncate text-sm font-bold">{fullName}</p>
              <p className="truncate text-[0.6875rem] text-muted-foreground">
                {department} · {scheduleLabel(row.period.employmentType)}
              </p>
            </div>
          </div>
          <span
            className={`shrink-0 rounded-md px-2.5 py-1 text-[0.6875rem] font-bold ${meta.badgeClass}`}
          >
            {meta.label}
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 rounded-[11px] bg-[var(--surface-subtle)] px-3 py-2.5">
          <div>
            <p className="text-[0.625rem] font-bold tracking-[0.06em] text-muted-foreground uppercase">
              Check-in
            </p>
            <p className={`font-numeric text-sm font-bold ${checkInClass(row, status === "late")}`}>
              {formatTime(row.day.firstIn, timeZone)}
            </p>
          </div>
          <div>
            <p className="text-[0.625rem] font-bold tracking-[0.06em] text-muted-foreground uppercase">
              Check-out
            </p>
            <p className="font-numeric text-sm font-bold text-muted-foreground">
              {formatTime(row.day.lastOut, timeZone)}
            </p>
          </div>
        </div>
      </button>
    </li>
  );
}

export function RegisterTable({
  date,
  rows,
  total,
  page,
  pageCount,
  pageSize,
  loading,
  refreshing,
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
  refreshing: boolean;
  filter: RegisterFilter;
  departmentNames: Map<string, string>;
  timeZone: string;
  onFilterChange: (filter: RegisterFilter) => void;
  onSelect: (employeeId: string) => void;
  onPageChange: (page: number) => void;
}) {
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
        <ul
          className={`sm:hidden ${refreshing ? "opacity-50 transition-opacity" : "transition-opacity"}`}
          aria-busy={refreshing}
        >
          {rows.map((row) => (
            <RegisterCard
              key={row.employee.id}
              row={row}
              departmentNames={departmentNames}
              timeZone={timeZone}
              onSelect={onSelect}
            />
          ))}
        </ul>
        <div className="hidden overflow-x-auto sm:block">
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
            {/* Dimming the outgoing rows makes a page flip register instantly,
                even while the next page is still on the wire. */}
            <tbody
              className={refreshing ? "opacity-50 transition-opacity" : "transition-opacity"}
              aria-busy={refreshing}
            >
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
