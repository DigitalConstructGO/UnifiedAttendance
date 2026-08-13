"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  type EmployeeRow,
  type EmploymentContractRow,
  workforceApi,
  workforceKeys,
  workforceQueries,
} from "@/lib/api";
import { presentRequestError } from "@/lib/errors";
import { firstQueryFailure } from "@/lib/query-errors";

import { contractValuesFrom, cosignerValuesFrom } from "./contract-form-payloads";
import { uploadContractDocuments } from "./uploads";

export function useContractsWorkspace({
  employees,
  contractId,
}: {
  employees: EmployeeRow[];
  contractId?: string;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);

  const contractsQuery = useQuery(workforceQueries.employmentContracts());
  const cosignersQuery = useQuery(workforceQueries.cosigners());

  const contracts = contractsQuery.data ?? [];
  const employeeIds = new Set(employees.map((row) => row.employee.id));
  const branchContracts = contracts.filter((row) => employeeIds.has(row.employee.id));
  const editing = contractId
    ? (contracts.find((row) => row.contract.id === contractId) ?? null)
    : null;

  async function invalidateContracts() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: workforceKeys.contracts }),
      queryClient.invalidateQueries({ queryKey: workforceKeys.cosigners }),
    ]);
  }

  const saveContract = useMutation({
    mutationFn: async (data: FormData) => {
      const contractValues = contractValuesFrom(data);
      const cosignerValues = cosignerValuesFrom(data);
      const saved = editing
        ? await workforceApi.updateEmploymentContract({
            id: editing.contract.id,
            ...contractValues,
          })
        : await workforceApi.createEmploymentContract({
            employeeId: String(data.get("employeeId")),
            ...contractValues,
            cosigner: cosignerValues,
          });
      if (editing) {
        await workforceApi.updateCosigner({ id: editing.cosigner.id, ...cosignerValues });
      }
      const failures = await uploadContractDocuments(data, saved, setUploadProgress);
      return { saved, failures };
    },
    onSuccess: async ({ saved, failures }) => {
      await Promise.all([
        invalidateContracts(),
        queryClient.invalidateQueries({ queryKey: workforceKeys.employeesAll }),
      ]);
      if (failures.length > 0) {
        setNotice(
          `Contract saved, but these uploads failed: ${failures.join("; ")}. You can retry here.`,
        );
        router.replace(
          `/dashboard/employees?section=contracts&view=create&contractId=${saved.contract.id}`,
        );
        return;
      }
      setNotice("Contract, cosigner, and selected documents saved.");
      router.push("/dashboard/employees?section=contracts&view=list");
    },
    onSettled: () => setUploadProgress(null),
  });

  const deleteContract = useMutation({
    mutationFn: workforceApi.deleteEmploymentContract,
    onSuccess: async () => {
      await invalidateContracts();
      setNotice("Employment contract deleted.");
    },
  });

  const writeError = saveContract.error
    ? presentRequestError(saveContract.error, "Could not save the employment contract.")
    : deleteContract.error
      ? presentRequestError(deleteContract.error, "Could not delete the employment contract.")
      : null;
  const loadFailure = firstQueryFailure([
    [contractsQuery, "Could not load employment contracts."],
    [cosignersQuery, "Could not load cosigners."],
  ]);

  function clearFeedback() {
    setNotice(null);
    saveContract.reset();
    deleteContract.reset();
  }

  return {
    branchContracts,
    cosigners: cosignersQuery.data ?? [],
    editing,
    busy: saveContract.isPending || deleteContract.isPending,
    error: writeError ?? loadFailure?.error ?? null,
    notice,
    uploadProgress,
    saveContract: (form: HTMLFormElement) => {
      clearFeedback();
      setUploadProgress(null);
      saveContract.mutate(new FormData(form));
    },
    deleteContract: (row: EmploymentContractRow) => {
      clearFeedback();
      deleteContract.mutate(row.contract.id);
    },
    editContract: (row: EmploymentContractRow) => {
      router.push(
        `/dashboard/employees?section=contracts&view=create&contractId=${row.contract.id}`,
      );
    },
    retry: loadFailure?.retry,
  };
}
