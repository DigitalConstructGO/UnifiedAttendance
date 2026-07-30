import type { ReactNode } from "react";

import type { Branch, Department, Position } from "@/lib/api";
import { EMPLOYMENT_TYPES, employmentLabel } from "@/lib/workforce-presentation";

export const selectClass =
  "h-10 rounded-[11px] border border-input bg-background px-3 text-xs font-normal outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50";

export const compactSelectClass =
  "h-9 rounded-[9px] border border-input bg-background px-3 text-xs";

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="text-strong grid gap-2 text-xs font-bold">
      {label}
      {children}
    </label>
  );
}

/** Employment types shared by the create form and the transition form. */
export function EmploymentTypeOptions() {
  return (
    <>
      {EMPLOYMENT_TYPES.map((employmentType) => (
        <option key={employmentType} value={employmentType}>
          {employmentLabel(employmentType)}
        </option>
      ))}
    </>
  );
}

export function BranchOptions({ branches }: { branches: Branch[] }) {
  return (
    <>
      {branches.map((branch) => (
        <option key={branch.id} value={branch.id}>
          {branch.name}
        </option>
      ))}
    </>
  );
}

export function DepartmentOptions({ departments }: { departments: Department[] }) {
  return (
    <>
      <option value="">No department</option>
      {departments.map((item) => (
        <option key={item.id} value={item.id}>
          {item.name}
        </option>
      ))}
    </>
  );
}

export function PositionOptions({ positions }: { positions: Position[] }) {
  return (
    <>
      <option value="">No position</option>
      {positions.map((item) => (
        <option key={item.id} value={item.id}>
          {item.title}
        </option>
      ))}
    </>
  );
}
