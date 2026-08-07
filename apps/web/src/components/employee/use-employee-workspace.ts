"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { organizationQueries, workforceApi, workforceKeys, workforceQueries } from "@/lib/api";
import { presentRequestError } from "@/lib/errors";
import { firstQueryFailure } from "@/lib/query-errors";

import { createEmployeePayload } from "./employee-form-payloads";

/**
 * Owns every piece of employee-workspace state and the API calls that mutate it.
 * Sections receive plain data and callbacks; none of them touch the API directly.
 * A single employee's reads and writes live on the profile page's own hook.
 */
export function useEmployeeWorkspace() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [chosenBranchId, setChosenBranchId] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const branchesQuery = useQuery(organizationQueries.branches());
  const departmentsQuery = useQuery(workforceQueries.departments());
  const positionsQuery = useQuery(workforceQueries.positions());

  const branches = branchesQuery.data ?? [];
  const branchId = chosenBranchId || branches[0]?.id || "";

  const employeesQuery = useQuery(workforceQueries.employees(branchId));
  const employees = employeesQuery.data ?? [];

  async function invalidateDirectory() {
    await queryClient.invalidateQueries({ queryKey: workforceKeys.employeesAll });
  }

  const createEmployee = useMutation({
    mutationFn: workforceApi.createEmployee,
    onSuccess: async (created) => {
      setNotice(`Employee created as ${created.employee.employeeCode}.`);
      await invalidateDirectory();
      router.push("/dashboard/employees?section=employees");
    },
  });

  const writeError = createEmployee.error;
  const loadFailure = firstQueryFailure([
    [branchesQuery, "Could not load branches."],
    [departmentsQuery, "Could not load departments."],
    [positionsQuery, "Could not load positions."],
    [employeesQuery, "Could not load employees."],
  ]);
  const error = writeError
    ? presentRequestError(writeError, "Could not complete the employee action.")
    : (loadFailure?.error ?? null);

  /** Clears the banner and any previous write failure so one action reports one result. */
  function clearFeedback() {
    setNotice(null);
    createEmployee.reset();
  }

  return {
    catalogs: {
      branches,
      departments: departmentsQuery.data ?? [],
      positions: positionsQuery.data ?? [],
    },
    employees,
    branchId,
    notice,
    error,
    busy: createEmployee.isPending,
    setBranchId: setChosenBranchId,
    changeBranch: setChosenBranchId,
    createEmployee: (form: HTMLFormElement) => {
      clearFeedback();
      createEmployee.mutate(createEmployeePayload(new FormData(form)), {
        onSuccess: () => form.reset(),
      });
    },
    retry: loadFailure?.retry,
  };
}
