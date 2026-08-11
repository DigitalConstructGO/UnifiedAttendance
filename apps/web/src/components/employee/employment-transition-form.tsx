import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { EmployeeRow } from "@/lib/api";

import {
  BranchOptions,
  compactSelectClass,
  DepartmentOptions,
  EmploymentTypeOptions,
  PositionOptions,
} from "./fields";
import type { EmployeeCatalogs } from "./workspace-model";
import {
  EMPLOYEE_STATUSES,
  EMPLOYMENT_TRANSITION_STATUS_LABELS,
} from "@/lib/workforce-presentation";

export function EmploymentTransitionForm({
  selected,
  catalogs,
  busy,
  onSubmit,
  onDelete,
}: {
  selected: EmployeeRow;
  catalogs: EmployeeCatalogs;
  busy: boolean;
  onSubmit: (form: HTMLFormElement) => void;
  onDelete: () => void;
}) {
  const [departmentId, setDepartmentId] = useState("");
  return (
    <Card className="rounded-[18px] shadow-[var(--shadow-card)] ring-border">
      <CardHeader>
        <CardTitle className="font-bold">Employment transition</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(event.currentTarget);
          }}
        >
          <Input
            required
            type="date"
            name="effectiveFrom"
            aria-label="Effective from"
            className="h-9 rounded-[9px]"
          />
          <select
            name="branchId"
            defaultValue={selected.employee.branchId}
            aria-label="Branch"
            className={compactSelectClass}
          >
            <BranchOptions branches={catalogs.branches} />
          </select>
          <select
            name="departmentId"
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
            aria-label="Department"
            className={compactSelectClass}
          >
            <DepartmentOptions departments={catalogs.departments} />
          </select>
          <select
            key={departmentId}
            name="positionId"
            aria-label="Position"
            className={compactSelectClass}
          >
            <PositionOptions positions={catalogs.positions} departmentId={departmentId} />
          </select>
          <select
            name="employmentType"
            defaultValue={selected.employee.employmentType}
            aria-label="Employment type"
            className={compactSelectClass}
          >
            <EmploymentTypeOptions />
          </select>
          <select
            name="status"
            defaultValue={EMPLOYEE_STATUSES[0]}
            aria-label="Employment status"
            className={compactSelectClass}
          >
            {EMPLOYEE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {EMPLOYMENT_TRANSITION_STATUS_LABELS[status]}
              </option>
            ))}
          </select>
          <Button disabled={busy} className="h-9 rounded-[9px] font-bold">
            Save dated transition
          </Button>
        </form>
        <Button
          variant="destructive"
          disabled={busy}
          className="h-9 w-full rounded-[9px] font-bold"
          onClick={onDelete}
        >
          Move to archive
        </Button>
      </CardContent>
    </Card>
  );
}
