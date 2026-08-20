import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { EmployeeRow } from "@/lib/api";

import { compactSelectClass, Field } from "./fields";

const fieldClass = "h-9 rounded-[9px]";

export function EmployeeDetailForm({
  selected,
  busy,
  onSubmit,
}: {
  selected: EmployeeRow;
  busy: boolean;
  onSubmit: (form: HTMLFormElement) => void;
}) {
  return (
    <Card className="rounded-[18px] shadow-[var(--shadow-card)] ring-border">
      <CardHeader>
        <CardTitle className="font-bold">Employee details</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="grid gap-3"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(event.currentTarget);
          }}
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name">
              <Input
                required
                name="firstName"
                defaultValue={selected.person.firstName}
                className={fieldClass}
              />
            </Field>
            <Field label="Last name">
              <Input
                required
                name="lastName"
                defaultValue={selected.person.lastName}
                className={fieldClass}
              />
            </Field>
            <Field label="Middle name">
              <Input
                name="middleName"
                defaultValue={selected.person.middleName ?? ""}
                placeholder="Optional"
                className={fieldClass}
              />
            </Field>
            <Field label="Gender">
              <select
                name="gender"
                defaultValue={selected.person.gender ?? ""}
                className={compactSelectClass}
              >
                <option value="">Not recorded</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </Field>
            <Field label="Phone">
              <Input
                name="phone"
                defaultValue={selected.person.phone ?? ""}
                placeholder="Optional"
                className={fieldClass}
              />
            </Field>
            <Field label="Email">
              <Input
                type="email"
                name="email"
                defaultValue={selected.person.email ?? ""}
                placeholder="Optional"
                className={fieldClass}
              />
            </Field>
            <Field label="Employee ID">
              <Input
                required
                name="employeeCode"
                defaultValue={selected.employee.employeeCode}
                className={fieldClass}
              />
            </Field>
            <Field label="Hire date">
              <Input
                required
                type="date"
                name="hireDate"
                defaultValue={selected.employee.hireDate}
                className={fieldClass}
              />
            </Field>
          </div>

          <Field label="Schedule">
            <select
              name="schedule"
              defaultValue={selected.employee.hasFixedSchedule ? "fixed" : "flexible"}
              className={compactSelectClass}
            >
              <option value="fixed">Fixed working days</option>
              <option value="flexible">Comes as needed — never counted absent</option>
            </select>
          </Field>

          <div className="grid gap-3 border-t border-border pt-3 sm:grid-cols-2">
            <Field label="Emergency contact name">
              <Input
                name="emergencyContactName"
                defaultValue={selected.person.emergencyContactName ?? ""}
                placeholder="Optional"
                className={fieldClass}
              />
            </Field>
            <Field label="Emergency contact phone">
              <Input
                name="emergencyContactPhone"
                type="tel"
                defaultValue={selected.person.emergencyContactPhone ?? ""}
                placeholder="Optional"
                className={fieldClass}
              />
            </Field>
          </div>

          <Button disabled={busy} className="h-9 rounded-[9px] font-bold">
            Save details
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
