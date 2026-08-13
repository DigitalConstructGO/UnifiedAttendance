"use client";

import { useState } from "react";

import type { EmployeeRow, EmploymentContractRow } from "@/lib/api";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { RequestErrorAlert } from "@/components/request-error-alert";

import { ContractForm } from "./contract-form";
import type { EmploymentContractView } from "./contract-model";
import { ContractNavigation } from "./contract-navigation";
import { ContractTable } from "./contract-table";
import { CosignerDirectory } from "./cosigner-directory";
import { useContractsWorkspace } from "./use-contracts-workspace";

export type { EmploymentContractView } from "./contract-model";

export function EmploymentContractsWorkspace({
  employees,
  manageable,
  view,
  contractId,
}: {
  employees: EmployeeRow[];
  manageable: boolean;
  view: EmploymentContractView;
  contractId?: string;
}) {
  const workspace = useContractsWorkspace({ employees, contractId });
  const activeView = !manageable && view === "create" ? "list" : view;
  const [contractToDelete, setContractToDelete] = useState<EmploymentContractRow | null>(null);

  return (
    <div className="space-y-5">
      <ContractNavigation view={activeView} manageable={manageable} />
      {workspace.notice ? (
        <p role="status" className="text-sm text-success">
          {workspace.notice}
        </p>
      ) : null}
      {workspace.error ? (
        <RequestErrorAlert error={workspace.error} onRetry={workspace.retry} />
      ) : null}

      {activeView === "list" ? (
        <ContractTable
          contracts={workspace.branchContracts}
          manageable={manageable}
          busy={workspace.busy}
          onEdit={workspace.editContract}
          onDelete={setContractToDelete}
        />
      ) : null}

      {activeView === "create" ? (
        <ContractForm
          employees={employees}
          editing={workspace.editing}
          busy={workspace.busy}
          uploadProgress={workspace.uploadProgress}
          uploadStates={workspace.uploadStates}
          onSubmit={workspace.saveContract}
        />
      ) : null}

      {activeView === "cosigners" ? (
        <CosignerDirectory items={workspace.cosigners} manageable={manageable} />
      ) : null}

      {contractToDelete ? (
        <ConfirmDialog
          title={`Delete contract ${contractToDelete.contract.contractNumber}?`}
          description={`${contractToDelete.person.firstName} ${contractToDelete.person.lastName}'s contract record is removed for good.`}
          confirmLabel="Delete contract"
          onCancel={() => setContractToDelete(null)}
          onConfirm={() => {
            workspace.deleteContract(contractToDelete);
            setContractToDelete(null);
          }}
        />
      ) : null}
    </div>
  );
}
