import { FilePlus2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EmployeeRow, EmploymentContractRow } from "@/lib/api";

import { DEFAULT_CONTRACT_STATUS, type ContractStatus } from "../contract-model";
import { ContractDetails } from "./contract-details";
import { CosignerFields } from "./cosigner-fields";
import { ContractDocuments } from "./documents";

export function ContractForm({
  employees,
  editing,
  busy,
  uploadProgress,
  onSubmit,
}: {
  employees: EmployeeRow[];
  editing: EmploymentContractRow | null;
  busy: boolean;
  uploadProgress: string | null;
  onSubmit: (form: HTMLFormElement) => void;
}) {
  const [employeeId, setEmployeeId] = useState(
    editing?.employee.id ?? employees[0]?.employee.id ?? "",
  );
  const [status, setStatus] = useState<ContractStatus>(
    editing?.contract.status ?? DEFAULT_CONTRACT_STATUS,
  );

  useEffect(() => {
    if (editing) {
      setEmployeeId(editing.employee.id);
      setStatus(editing.contract.status);
    } else if (!employees.some((row) => row.employee.id === employeeId)) {
      setEmployeeId(employees[0]?.employee.id ?? "");
    }
  }, [editing, employeeId, employees]);

  return (
    <Card className="gap-0 rounded-[18px] py-0 shadow-[var(--shadow-card)] ring-border">
      <CardHeader className="border-b border-border px-5 py-5">
        <CardTitle className="text-strong flex items-center gap-2 text-base font-bold">
          <FilePlus2 className="size-5 text-info" aria-hidden="true" />
          {editing ? `Edit ${editing.contract.contractNumber}` : "Create employment contract"}
        </CardTitle>
        <p className="max-w-3xl text-xs leading-relaxed text-muted-foreground">
          Contract terms, the employee assignment active on the start date, required cosigner
          details, and private S3 documents are saved as one employment record.
        </p>
      </CardHeader>
      <CardContent className="p-5">
        <form
          key={editing?.contract.id ?? "new-contract"}
          className="space-y-7"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(event.currentTarget);
          }}
        >
          <ContractDetails
            employees={employees}
            editing={editing}
            employeeId={employeeId}
            status={status}
            onEmployeeChange={setEmployeeId}
            onStatusChange={setStatus}
          />
          <CosignerFields editing={editing} />
          <ContractDocuments />

          <div className="flex flex-wrap items-center gap-3 border-t border-border pt-5">
            <Button
              disabled={busy || !employeeId}
              className="h-10 rounded-[11px] px-5 font-bold shadow-[var(--shadow-action)]"
            >
              <FilePlus2 aria-hidden="true" />
              {busy
                ? (uploadProgress ?? "Saving contract…")
                : editing
                  ? "Save contract"
                  : "Create contract"}
            </Button>
            <Button asChild type="button" variant="ghost" className="h-10 rounded-[11px] px-4">
              <Link href="/dashboard/employees?section=contracts&view=list">Cancel</Link>
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
