import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { EmployeeRow } from "@/lib/api";

import {
  BranchOptions,
  compactSelectClass,
  DepartmentOptions,
  EmploymentTypeOptions,
  Field,
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
  const [departmentId, setDepartmentId] = useState(selected.department?.id ?? "");
  return (
    <Card className="rounded-[18px] shadow-[var(--shadow-card)] ring-border">
      <CardHeader>
        <CardTitle className="font-bold">Record employment change</CardTitle>
        <CardDescription>
          Create a dated employment record without overwriting earlier history.
        </CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(event.currentTarget);
          }}
        >
          <Field label="Change takes effect">
            <span className="grid gap-1.5">
              <Input required type="date" name="effectiveFrom" className="h-9 rounded-[9px]" />
              <span className="font-normal text-muted-foreground">
                Choose the first day the new employment details apply.
              </span>
            </span>
          </Field>

          <p className="text-strong text-xs font-bold">New employment details</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Branch">
              <select
                name="branchId"
                defaultValue={selected.employee.branchId}
                className={compactSelectClass}
              >
                <BranchOptions branches={catalogs.branches} />
              </select>
            </Field>
            <Field label="Department">
              <select
                name="departmentId"
                value={departmentId}
                onChange={(event) => setDepartmentId(event.target.value)}
                className={compactSelectClass}
              >
                <DepartmentOptions departments={catalogs.departments} />
              </select>
            </Field>
            <Field label="Position">
              <select
                key={departmentId}
                name="positionId"
                defaultValue={selected.position?.id ?? ""}
                className={compactSelectClass}
              >
                <PositionOptions positions={catalogs.positions} departmentId={departmentId} />
              </select>
            </Field>
            <Field label="Employment type">
              <select
                name="employmentType"
                defaultValue={selected.employee.employmentType}
                className={compactSelectClass}
              >
                <EmploymentTypeOptions />
              </select>
            </Field>
          </div>

          <Field label="Employment status">
            <select
              name="status"
              defaultValue={selected.employee.status}
              className={compactSelectClass}
            >
              {EMPLOYEE_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {EMPLOYMENT_TRANSITION_STATUS_LABELS[status]}
                </option>
              ))}
            </select>
          </Field>

          <Button disabled={busy} className="h-9 rounded-[9px] font-bold">
            Record employment change
          </Button>
        </form>

        <div className="border-t border-border pt-4">
          <p className="text-strong text-xs font-bold">Archive employee</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Remove this employee from active workflows while keeping their profile and history.
          </p>
          <Button
            variant="destructive"
            disabled={busy}
            className="mt-3 h-9 w-full rounded-[9px] font-bold"
            onClick={onDelete}
          >
            Archive employee
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
