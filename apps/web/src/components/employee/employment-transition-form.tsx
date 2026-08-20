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
  const [departmentId, setDepartmentId] = useState("");
  return (
    <Card className="rounded-[18px] shadow-[var(--shadow-card)] ring-border">
      <CardHeader>
        <CardTitle className="font-bold">Employment transition</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-4">
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(event.currentTarget);
          }}
        >
          <Field label="Effective from">
            <Input required type="date" name="effectiveFrom" className="h-9 rounded-[9px]" />
          </Field>

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
              <select key={departmentId} name="positionId" className={compactSelectClass}>
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
              defaultValue={EMPLOYEE_STATUSES[0]}
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
            Save dated transition
          </Button>
        </form>

        <div className="border-t border-border pt-4">
          <Button
            variant="destructive"
            disabled={busy}
            className="h-9 w-full rounded-[9px] font-bold"
            onClick={onDelete}
          >
            Move to archive
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
