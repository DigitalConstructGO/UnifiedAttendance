import { Target } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { Branch, ClientRow, EmployeeRow, Industry, PipelineStage } from "@/lib/api";
import { clientName, personName } from "@/lib/client-presentation";
import type { RequestErrorPresentation } from "@/lib/errors";

import { DialogField, dialogFieldClass, RecordDialog } from "../client-agreements/record-dialog";

export function AddLeadDialog({
  branches,
  industries,
  stages,
  employees,
  clients,
  busy,
  error,
  onSubmit,
  onClose,
}: {
  branches: Branch[];
  industries: Industry[];
  stages: PipelineStage[];
  employees: EmployeeRow[];
  clients: ClientRow[];
  busy: boolean;
  error: RequestErrorPresentation | null;
  onSubmit: (form: HTMLFormElement) => void;
  onClose: () => void;
}) {
  return (
    <RecordDialog
      title="New lead"
      description="Start an opportunity in the sales pipeline"
      icon={<Target className="size-5" />}
      busy={busy}
      submitLabel="Create lead"
      error={error}
      onSubmit={onSubmit}
      onClose={onClose}
    >
      <DialogField label="Company / lead name">
        <Input required name="name" placeholder="e.g. Awash Insurance S.C." />
      </DialogField>

      <DialogField label="Existing client (optional)">
        <select name="clientId" className={dialogFieldClass} defaultValue="">
          <option value="">Not a client yet — this is a fresh lead</option>
          {clients.map((row) => (
            <option key={row.client.id} value={row.client.id}>
              {clientName(row.client)}
            </option>
          ))}
        </select>
      </DialogField>

      <div className="grid gap-4 sm:grid-cols-2">
        <DialogField label="Industry">
          <select name="industryId" className={dialogFieldClass}>
            <option value="">No industry selected</option>
            {industries.map((industry) => (
              <option key={industry.id} value={industry.id}>
                {industry.name}
              </option>
            ))}
          </select>
        </DialogField>
        <DialogField label="Starting stage">
          <select required name="pipelineStageId" className={dialogFieldClass}>
            {stages.map((stage) => (
              <option key={stage.id} value={stage.id}>
                {stage.name}
              </option>
            ))}
          </select>
        </DialogField>
        <DialogField label="Account owner">
          <select required name="ownerEmployeeId" className={dialogFieldClass}>
            {employees.map((row) => (
              <option key={row.employee.id} value={row.employee.id}>
                {personName(row.person)}
              </option>
            ))}
          </select>
        </DialogField>
        <DialogField label="Branch">
          <select required name="branchId" className={dialogFieldClass}>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </DialogField>
      </div>
    </RecordDialog>
  );
}
