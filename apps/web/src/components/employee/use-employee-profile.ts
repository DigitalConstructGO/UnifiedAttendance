"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { organizationQueries, workforceApi, workforceKeys, workforceQueries } from "@/lib/api";
import { presentRequestError } from "@/lib/errors";
import { firstQueryFailure } from "@/lib/query-errors";

import { transitionPayload, updateEmployeePayload } from "./employee-form-payloads";

/**
 * The profile page's counterpart to useEmployeeWorkspace: one employee, read
 * by id so the page survives a refresh, plus the writes that page offers.
 */
export function useEmployeeProfile(employeeId: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);

  const employeeQuery = useQuery(workforceQueries.employee(employeeId));
  const periodsQuery = useQuery(workforceQueries.employmentPeriods(employeeId));
  const branchesQuery = useQuery(organizationQueries.branches());
  const departmentsQuery = useQuery(workforceQueries.departments());
  const positionsQuery = useQuery(workforceQueries.positions());

  /** The employee and periods keys both live under the employees prefix. */
  async function invalidate() {
    await queryClient.invalidateQueries({ queryKey: workforceKeys.employeesAll });
  }

  const updateEmployee = useMutation({
    mutationFn: workforceApi.updateEmployee,
    onSuccess: async () => {
      setNotice("Employee details updated.");
      await invalidate();
    },
  });

  const transitionEmployee = useMutation({
    mutationFn: workforceApi.transitionEmployment,
    onSuccess: async () => {
      setNotice("Employment transition saved.");
      await invalidate();
    },
  });

  const deleteEmployee = useMutation({
    mutationFn: workforceApi.deleteEmployee,
    onSuccess: async () => {
      await invalidate();
      router.push("/dashboard/employees?section=employees");
    },
  });

  const writeError = updateEmployee.error ?? transitionEmployee.error ?? deleteEmployee.error;
  const loadFailure = firstQueryFailure([
    [employeeQuery, "Could not load this employee."],
    [periodsQuery, "Could not load employment history."],
    [branchesQuery, "Could not load branches."],
    [departmentsQuery, "Could not load departments."],
    [positionsQuery, "Could not load positions."],
  ]);
  const error = writeError
    ? presentRequestError(writeError, "Could not complete the employee action.")
    : (loadFailure?.error ?? null);

  function clearFeedback() {
    setNotice(null);
    updateEmployee.reset();
    transitionEmployee.reset();
    deleteEmployee.reset();
  }

  const employee = employeeQuery.data ?? null;

  return {
    employee,
    periods: periodsQuery.data ?? [],
    catalogs: {
      branches: branchesQuery.data ?? [],
      departments: departmentsQuery.data ?? [],
      positions: positionsQuery.data ?? [],
    },
    loading: employeeQuery.isPending,
    notice,
    error,
    busy: updateEmployee.isPending || transitionEmployee.isPending || deleteEmployee.isPending,
    updateEmployee: (form: HTMLFormElement) => {
      clearFeedback();
      updateEmployee.mutate(updateEmployeePayload(new FormData(form), employeeId));
    },
    transitionEmployee: (form: HTMLFormElement) => {
      clearFeedback();
      transitionEmployee.mutate(transitionPayload(new FormData(form), employeeId));
    },
    deleteEmployee: () => {
      if (
        !employee ||
        !window.confirm(`Delete ${employee.person.firstName} ${employee.person.lastName}?`)
      )
        return;
      clearFeedback();
      deleteEmployee.mutate(employeeId);
    },
    retry: loadFailure?.retry,
  };
}
