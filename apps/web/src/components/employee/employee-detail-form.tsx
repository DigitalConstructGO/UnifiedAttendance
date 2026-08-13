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
            name="middleName"
            defaultValue={selected.person.middleName ?? ""}
            aria-label="Middle name"
            placeholder="Middle name"
            className={fieldClass}
          />
          <Input
            required
            name="lastName"
            defaultValue={selected.person.lastName}
            aria-label="Last name"
            className={fieldClass}
          />
          <select
            name="gender"
            defaultValue={selected.person.gender ?? ""}
            aria-label="Gender"
            className={compactSelectClass}
          >
            <option value="">Gender not recorded</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
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
          <Input
            name="emergencyContactName"
            defaultValue={selected.person.emergencyContactName ?? ""}
            aria-label="Emergency contact name"
            placeholder="Emergency contact name"
            className={fieldClass}
          />
          <Input
            name="emergencyContactPhone"
            type="tel"
            defaultValue={selected.person.emergencyContactPhone ?? ""}
            aria-label="Emergency contact phone"
            placeholder="Emergency contact phone"
            className={fieldClass}
          />
          <Button disabled={busy} className="h-9 rounded-[9px] font-bold">
            Save details
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
