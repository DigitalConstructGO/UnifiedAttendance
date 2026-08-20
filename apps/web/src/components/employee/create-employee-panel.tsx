import { Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  defaultScheduleFor,
  EMPLOYMENT_TYPES,
  type EmploymentType,
} from "@/lib/workforce-presentation";

import {
  BranchOptions,
  DepartmentOptions,
  EmploymentTypeOptions,
  Field,
  PositionOptions,
  selectClass,
} from "./fields";
import type { EmployeeCatalogs } from "./workspace-model";

export function CreateEmployeePanel({
  catalogs,
  branchId,
  busy,
  onBranchChange,
  onSubmit,
}: {
  catalogs: EmployeeCatalogs;
  branchId: string;
  busy: boolean;
  onBranchChange: (branchId: string) => void;
  onSubmit: (form: HTMLFormElement) => void;
}) {
  const inputClass = "h-10 rounded-[11px] px-3 font-normal";
  const [departmentId, setDepartmentId] = useState("");
  const [employmentType, setEmploymentType] = useState<EmploymentType>(EMPLOYMENT_TYPES[0]);
  const [schedule, setSchedule] = useState(defaultScheduleFor(EMPLOYMENT_TYPES[0]));
  const [scheduleTouched, setScheduleTouched] = useState(false);

  return (
    <Card className="gap-0 rounded-[18px] py-0 shadow-[var(--shadow-card)] ring-border">
      <CardHeader className="border-b border-border px-5 py-5">
        <CardTitle className="text-base font-bold">Employee information</CardTitle>
        <p className="text-xs text-muted-foreground">
          Required fields create both the employee profile and the first employment period. The
          employee ID is assigned automatically from the organization, branch and department.
        </p>
      </CardHeader>
      <CardContent className="p-5">
        <form
          className="grid gap-x-4 gap-y-5 md:grid-cols-2 xl:grid-cols-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(event.currentTarget);
          }}
        >
          <Field label="First name">
            <Input required name="firstName" autoComplete="given-name" className={inputClass} />
          </Field>
          <Field label="Middle name">
            <Input
              name="middleName"
              autoComplete="additional-name"
              placeholder="Optional"
              className={inputClass}
            />
          </Field>
          <Field label="Last name">
            <Input required name="lastName" autoComplete="family-name" className={inputClass} />
          </Field>
          <Field label="Gender">
            <select name="gender" defaultValue="" className={selectClass}>
              <option value="">Not recorded</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </Field>
          <Field label="Phone">
            <Input
              name="phone"
              type="tel"
              autoComplete="tel"
              placeholder="Optional"
              className={inputClass}
            />
          </Field>
          <Field label="Email">
            <Input
              name="email"
              type="email"
              autoComplete="email"
              placeholder="Optional"
              className={inputClass}
            />
          </Field>
          <Field label="Hire date">
            <Input required name="hireDate" type="date" className="h-10 rounded-[11px] px-3" />
          </Field>
          <Field label="Branch">
            <select
              required
              name="branchId"
              value={branchId}
              onChange={(event) => onBranchChange(event.target.value)}
              className={selectClass}
            >
              <BranchOptions branches={catalogs.branches} />
            </select>
          </Field>
          <Field label="Department">
            <select
              name="departmentId"
              value={departmentId}
              onChange={(event) => setDepartmentId(event.target.value)}
              className={selectClass}
            >
              <DepartmentOptions departments={catalogs.departments} />
            </select>
          </Field>
          <Field label="Position">
            <select key={departmentId} name="positionId" className={selectClass}>
              <PositionOptions positions={catalogs.positions} departmentId={departmentId} />
            </select>
          </Field>
          <Field label="Employment type">
            <select
              name="employmentType"
              value={employmentType}
              onChange={(event) => {
                const nextType = event.target.value as EmploymentType;
                setEmploymentType(nextType);
                if (!scheduleTouched) setSchedule(defaultScheduleFor(nextType));
              }}
              className={selectClass}
            >
              <EmploymentTypeOptions />
            </select>
          </Field>
          <Field label="Schedule">
            <select
              name="schedule"
              value={schedule}
              onChange={(event) => {
                setScheduleTouched(true);
                setSchedule(event.target.value as typeof schedule);
              }}
              className={selectClass}
            >
              <option value="fixed">Fixed working days</option>
              <option value="flexible">Comes as needed — never counted absent</option>
            </select>
          </Field>
          <Field label="Emergency contact name">
            <Input name="emergencyContactName" placeholder="Optional" className={inputClass} />
          </Field>
          <Field label="Emergency contact phone">
            <Input
              name="emergencyContactPhone"
              type="tel"
              placeholder="Optional"
              className={inputClass}
            />
          </Field>
          <div className="flex items-end gap-2 md:col-span-2 xl:col-span-3">
            <Button
              disabled={busy || !branchId}
              className="h-10 rounded-[11px] px-5 font-bold shadow-[var(--shadow-action)]"
            >
              <Plus aria-hidden="true" />
              {busy ? "Creating employee…" : "Create employee"}
            </Button>
            <Button asChild variant="ghost" className="h-10 rounded-[11px] px-4">
              <Link href="/dashboard/employees?section=employees">Cancel</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
