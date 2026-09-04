import type { EmployeeRow, EmploymentContractRow } from "@/lib/api";
import { employmentLabel } from "@/lib/workforce-presentation";

type Preview = {
  name: string;
  code: string;
  phone: string;
  email: string;
  department: string;
  position: string;
  employmentType: EmployeeRow["employee"]["employmentType"];
};

export function previewFor(
  selectedEmployee: EmployeeRow | null,
  editing: EmploymentContractRow | null,
): Preview | null {
  if (selectedEmployee) {
    return {
      name: `${selectedEmployee.person.firstName} ${selectedEmployee.person.lastName}`,
      code: selectedEmployee.employee.employeeCode,
      phone: selectedEmployee.person.phone ?? "Not provided",
      email: selectedEmployee.person.email ?? "Not provided",
      department: selectedEmployee.department?.name ?? "Not assigned",
      position: selectedEmployee.position?.title ?? "Not assigned",
      employmentType: selectedEmployee.employee.employmentType,
    };
  }
  if (editing) {
    return {
      name: `${editing.person.firstName} ${editing.person.lastName}`,
      code: editing.employee.employeeCode,
      phone: editing.person.phone ?? "Not provided",
      email: editing.person.email ?? "Not provided",
      department: editing.department?.name ?? "Not assigned",
      position: editing.position?.title ?? "Not assigned",
      employmentType: editing.period.employmentType,
    };
  }
  return null;
}

export function EmployeePreview({ preview }: { preview: Preview }) {
  const entries: [string, string][] = [
    ["Employee", preview.name],
    ["Employee ID", preview.code],
    ["Phone", preview.phone],
    ["Email", preview.email],
    ["Department", preview.department],
    ["Position", preview.position],
    ["Employment", employmentLabel(preview.employmentType)],
  ];

  return (
    <dl className="grid gap-3 rounded-[12px] bg-[var(--surface-subtle)] p-4 text-xs md:col-span-2 md:grid-cols-2 xl:col-span-3 xl:grid-cols-4">
      {entries.map(([label, value]) => (
        <div key={label}>
          <dt className="text-muted-foreground">{label}</dt>
          <dd className="text-strong mt-1 font-bold">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
