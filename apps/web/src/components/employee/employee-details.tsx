import type { EmployeeRow, EmploymentPeriod } from "@/lib/api";

import { EmployeeDetailForm } from "./employee-detail-form";
import { EmploymentHistory } from "./employment-history";
import { EmploymentTransitionForm } from "./employment-transition-form";
import type { EmployeeCatalogs } from "./workspace-model";

export function EmployeeDetails({
  selected,
  periods,
  catalogs,
  manageable,
  busy,
  onUpdate,
  onTransition,
  onDelete,
}: {
  selected: EmployeeRow;
  periods: EmploymentPeriod[];
  catalogs: EmployeeCatalogs;
  manageable: boolean;
  busy: boolean;
  onUpdate: (form: HTMLFormElement) => void;
  onTransition: (form: HTMLFormElement) => void;
  onDelete: () => void;
}) {
  return (
    <section className="grid gap-5 lg:grid-cols-[0.8fr_1fr_1fr]" aria-label="Employee details">
      <EmploymentHistory selected={selected} periods={periods} />
      {manageable ? (
        <>
          <EmployeeDetailForm selected={selected} busy={busy} onSubmit={onUpdate} />
          <EmploymentTransitionForm
            selected={selected}
            catalogs={catalogs}
            busy={busy}
            onSubmit={onTransition}
            onDelete={onDelete}
          />
        </>
      ) : null}
    </section>
  );
}
