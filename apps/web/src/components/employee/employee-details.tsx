import type { EmployeeProfileRow, EmploymentPeriod } from "@/lib/api";

import { EmployeeDetailForm } from "./employee-detail-form";
import { EmploymentHistory } from "./employment-history";
import { EmploymentTransitionForm } from "./employment-transition-form";
import { PersonAssetsCard } from "./person-assets-card";
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
  selected: EmployeeProfileRow;
  periods: EmploymentPeriod[];
  catalogs: EmployeeCatalogs;
  manageable: boolean;
  busy: boolean;
  onUpdate: (form: HTMLFormElement) => void;
  onTransition: (form: HTMLFormElement) => void;
  onDelete: () => void;
}) {
  const reference = (
    <div className="grid gap-5">
      <EmploymentHistory selected={selected} periods={periods} />
      <PersonAssetsCard personId={selected.person.id} assets={selected.personAssets} />
    </div>
  );

  if (!manageable) {
    return (
      <section className="max-w-md" aria-label="Employee details">
        {reference}
      </section>
    );
  }

  return (
    <section
      className="grid items-start gap-5 lg:grid-cols-[340px_minmax(0,1fr)]"
      aria-label="Employee details"
    >
      {reference}
      <div className="grid gap-5">
        <EmployeeDetailForm selected={selected} busy={busy} onSubmit={onUpdate} />
        <EmploymentTransitionForm
          selected={selected}
          catalogs={catalogs}
          busy={busy}
          onSubmit={onTransition}
          onDelete={onDelete}
        />
      </div>
    </section>
  );
}
