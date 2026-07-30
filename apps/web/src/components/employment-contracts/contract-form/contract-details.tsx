import { Input } from "@/components/ui/input";
import type { EmployeeRow, EmploymentContractRow } from "@/lib/api";
import { CONTRACT_STATUS_META } from "@/lib/workforce-presentation";

import {
  CONTRACT_STATUSES,
  contractRequiresSignedDate,
  type ContractStatus,
} from "../contract-model";
import { Field, inputClass, selectClass } from "../fields";
import { EmployeePreview, previewFor } from "./employee-preview";

export function ContractDetails({
  employees,
  editing,
  employeeId,
  status,
  onEmployeeChange,
  onStatusChange,
}: {
  employees: EmployeeRow[];
  editing: EmploymentContractRow | null;
  employeeId: string;
  status: ContractStatus;
  onEmployeeChange: (id: string) => void;
  onStatusChange: (status: ContractStatus) => void;
}) {
  const selectedEmployee = employees.find((row) => row.employee.id === employeeId) ?? null;
  const preview = previewFor(selectedEmployee, editing);
  const editingIsOutsideBranch =
    editing && !employees.some((row) => row.employee.id === editing.employee.id);

  return (
    <fieldset className="grid gap-x-4 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
      <legend className="text-strong mb-4 text-sm font-bold">Contract details</legend>
      <Field label="Employee">
        <select
          required
          name="employeeId"
          value={employeeId}
          disabled={Boolean(editing)}
          onChange={(event) => onEmployeeChange(event.target.value)}
          className={`${selectClass} disabled:opacity-60`}
        >
          {editingIsOutsideBranch ? (
            <option value={editing.employee.id}>
              {editing.person.firstName} {editing.person.lastName} · {editing.employee.employeeCode}
            </option>
          ) : null}
          {employees.length === 0 ? <option value="">No employees in this branch</option> : null}
          {employees.map((row) => (
            <option key={row.employee.id} value={row.employee.id}>
              {row.person.firstName} {row.person.lastName} · {row.employee.employeeCode}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Contract number">
        <Input
          required
          name="contractNumber"
          defaultValue={editing?.contract.contractNumber}
          placeholder="e.g. EMP-CON-2026-001"
          className={inputClass}
        />
      </Field>
      <Field label="Status">
        <select
          name="status"
          value={status}
          onChange={(event) => onStatusChange(event.target.value as ContractStatus)}
          className={selectClass}
        >
          {CONTRACT_STATUSES.map((contractStatus) => (
            <option key={contractStatus} value={contractStatus}>
              {CONTRACT_STATUS_META[contractStatus].label}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Start date">
        <Input
          required
          type="date"
          name="startsOn"
          defaultValue={editing?.contract.startsOn}
          className={inputClass}
        />
      </Field>
      <Field label="End date">
        <Input
          type="date"
          name="endsOn"
          defaultValue={editing?.contract.endsOn ?? ""}
          className={inputClass}
        />
      </Field>
      <Field label="Signed date">
        <Input
          type="date"
          name="signedOn"
          required={contractRequiresSignedDate(status)}
          defaultValue={editing?.contract.signedOn ?? ""}
          className={inputClass}
        />
      </Field>
      <Field label="Notes" className="md:col-span-2 xl:col-span-3">
        <Input
          name="notes"
          defaultValue={editing?.contract.notes ?? ""}
          placeholder="Optional terms or internal note"
          className={inputClass}
        />
      </Field>
      {preview ? <EmployeePreview preview={preview} /> : null}
    </fieldset>
  );
}
