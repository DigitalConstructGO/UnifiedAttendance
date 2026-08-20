import { MoreVertical, UsersRound } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { DirectoryEmployeeRow } from "@/lib/api";
import { EMPLOYEE_STATUS_META, employmentLabel } from "@/lib/workforce-presentation";

function EmployeeCell({ row }: { row: DirectoryEmployeeRow }) {
  return (
    <span className="flex items-center gap-3">
      {row.profilePhotoUrl ? (
        <img
          src={row.profilePhotoUrl}
          alt=""
          className="size-9 shrink-0 rounded-[9px] object-cover ring-1 ring-border"
        />
      ) : (
        <span className="grid size-9 shrink-0 place-items-center rounded-[9px] bg-primary/10 text-xs font-bold text-primary">
          {row.person.firstName[0]}
          {row.person.lastName[0]}
        </span>
      )}
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

function DirectoryCard({ row }: { row: DirectoryEmployeeRow }) {
  const status = EMPLOYEE_STATUS_META[row.employee.status];

  return (
    <li className="border-b border-border px-5 py-4 last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <EmployeeCell row={row} />
        <Button
          asChild
          variant="ghost"
          size="icon-sm"
          className="shrink-0"
          aria-label={`View ${row.person.firstName} ${row.person.lastName}`}
        >
          <Link href={`/dashboard/employees/${row.employee.id}`} prefetch={false}>
            <MoreVertical aria-hidden="true" />
          </Link>
        </Button>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-[11px] bg-[var(--surface-subtle)] px-3 py-2.5 text-[0.6875rem]">
        <div>
          <dt className="text-muted-foreground">Department</dt>
          <dd className="text-strong mt-0.5 truncate font-semibold">
            {row.department?.name ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Position</dt>
          <dd className="text-strong mt-0.5 truncate font-semibold">
            {row.position?.title ?? "—"}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Employment</dt>
          <dd className="text-strong mt-0.5 truncate font-semibold">
            {employmentLabel(row.employee.employmentType)}
          </dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Status</dt>
          <dd className="mt-0.5">
            <span className={status.badgeClass}>{status.label}</span>
          </dd>
        </div>
      </dl>
    </li>
  );
}

export function DirectoryTable({ employees }: { employees: DirectoryEmployeeRow[] }) {
  return (
    <>
      <ul className="sm:hidden">
        {employees.map((row) => (
          <DirectoryCard key={row.employee.id} row={row} />
        ))}
      </ul>
      <div className="hidden overflow-x-auto sm:block">
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
                    asChild
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`View ${row.person.firstName} ${row.person.lastName}`}
                  >
                    <Link href={`/dashboard/employees/${row.employee.id}`} prefetch={false}>
                      <MoreVertical aria-hidden="true" />
                    </Link>
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
