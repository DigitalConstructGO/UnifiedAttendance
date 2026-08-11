import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { EmployeeRow } from "@/lib/api";

import { compactSelectClass } from "./fields";

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
          <Input
            required
            name="firstName"
            defaultValue={selected.person.firstName}
            aria-label="First name"
            className={fieldClass}
          />
          <Input
            required
            name="lastName"
            defaultValue={selected.person.lastName}
            aria-label="Last name"
            className={fieldClass}
          />
          <Input
            name="phone"
            defaultValue={selected.person.phone ?? ""}
            aria-label="Phone"
            placeholder="Phone"
            className={fieldClass}
          />
          <Input
            type="email"
            name="email"
            defaultValue={selected.person.email ?? ""}
            aria-label="Email"
            placeholder="Email"
            className={fieldClass}
          />
          <Input
            required
            name="employeeCode"
            defaultValue={selected.employee.employeeCode}
            aria-label="Employee ID"
            className={fieldClass}
          />
          <Input
            required
            type="date"
            name="hireDate"
            defaultValue={selected.employee.hireDate}
            aria-label="Hire date"
            className={fieldClass}
          />
          <select
            name="schedule"
            defaultValue={selected.employee.hasFixedSchedule ? "fixed" : "flexible"}
            aria-label="Schedule"
            className={compactSelectClass}
          >
            <option value="fixed">Fixed working days</option>
            <option value="flexible">Comes as needed — never counted absent</option>
          </select>
          <Button disabled={busy} className="h-9 rounded-[9px] font-bold">
            Save details
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
