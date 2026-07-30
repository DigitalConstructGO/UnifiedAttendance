import { MoreVertical, UsersRound } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { EmployeeRow } from "@/lib/api";
import { EMPLOYEE_STATUS_META, employmentLabel } from "@/lib/workforce-presentation";

function EmployeeCell({ row }: { row: EmployeeRow }) {
  return (
    <span className="flex items-center gap-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-[9px] bg-primary/10 text-xs font-bold text-primary">
        {row.person.firstName[0]}
        {row.person.lastName[0]}
      </span>
      <span className="min-w-0">
        <span className="block truncate">
          {row.person.firstName} {row.person.lastName}
        </span>
        <span className="block truncate text-[0.6875rem] font-normal text-muted-foreground">
          {row.employee.employeeCode} · {row.person.phone ?? "No phone"}
        </span>
      </span>
    </span>
  );
}

export function DirectoryTable({
  employees,
  onSelect,
}: {
  employees: EmployeeRow[];
  onSelect: (employee: EmployeeRow) => void;
}) {
  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left text-xs">
          <thead className="bg-[var(--surface-subtle)] text-[0.625rem] font-bold tracking-[0.06em] text-muted-foreground uppercase">
            <tr>
              <th className="px-5 py-3">Employee</th>
              <th className="px-4 py-3">Department</th>
              <th className="px-4 py-3">Position</th>
              <th className="px-4 py-3">Employment</th>
              <th className="px-4 py-3">Status</th>
              <th className="w-14 px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {employees.map((row) => (
              <tr key={row.employee.id} className="border-t border-border hover:bg-muted/40">
                <td className="text-strong px-5 py-3 font-semibold">
                  <EmployeeCell row={row} />
                </td>
                <td className="px-4 py-3 text-muted-foreground">{row.department?.name ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">{row.position?.title ?? "—"}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {employmentLabel(row.employee.employmentType)}
                </td>
                <td className="px-4 py-3">
                  <span className={EMPLOYEE_STATUS_META[row.employee.status].badgeClass}>
                    {EMPLOYEE_STATUS_META[row.employee.status].label}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`View ${row.person.firstName} ${row.person.lastName}`}
                    onClick={() => onSelect(row)}
                  >
                    <MoreVertical aria-hidden="true" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {employees.length === 0 ? (
        <div className="grid min-h-48 place-items-center px-5 text-center">
          <div>
            <UsersRound className="mx-auto size-7 text-muted-foreground" aria-hidden="true" />
            <p className="text-strong mt-3 text-sm font-bold">No employees found</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Try another search or status filter.
            </p>
          </div>
        </div>
      ) : null}
    </>
  );
}
