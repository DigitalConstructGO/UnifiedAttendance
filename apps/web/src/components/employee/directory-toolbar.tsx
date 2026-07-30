import { Download, Plus, Search } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  EMPLOYEE_STATUSES,
  EMPLOYEE_STATUS_META,
  type EmployeeStatus,
} from "@/lib/workforce-presentation";

export type StatusFilter = "all" | EmployeeStatus;

const STATUS_FILTERS: readonly StatusFilter[] = ["all", ...EMPLOYEE_STATUSES];

export function DirectoryToolbar({
  search,
  statusFilter,
  manageable,
  exportDisabled,
  onSearchChange,
  onStatusChange,
  onExport,
}: {
  search: string;
  statusFilter: StatusFilter;
  manageable: boolean;
  exportDisabled: boolean;
  onSearchChange: (value: string) => void;
  onStatusChange: (value: StatusFilter) => void;
  onExport: () => void;
}) {
  return (
    <div className="flex flex-col gap-3 xl:flex-row xl:items-center">
      <label className="relative min-w-0 flex-1">
        <span className="sr-only">Search employees</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          className="h-10 rounded-[11px] bg-[var(--surface-subtle)] pr-3 pl-9"
          placeholder="Search by name, ID, department…"
        />
      </label>
      <div className="flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((status) => (
          <Button
            key={status}
            size="sm"
            variant={statusFilter === status ? "default" : "outline"}
            className="h-8 rounded-[9px] px-3"
            onClick={() => onStatusChange(status)}
          >
            {status === "all" ? "All" : EMPLOYEE_STATUS_META[status].label}
          </Button>
        ))}
        <Button
          size="sm"
          variant="outline"
          className="h-8 rounded-[9px] px-3"
          onClick={onExport}
          disabled={exportDisabled}
        >
          <Download aria-hidden="true" />
          Export
        </Button>
        {manageable ? (
          <Button asChild size="sm" className="h-8 rounded-[9px] px-3">
            <Link href="/dashboard/employees?section=create">
              <Plus aria-hidden="true" />
              Create employee
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
