"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { organizationQueries, workforceApi, workforceKeys, workforceQueries } from "@/lib/api";
import { presentRequestError } from "@/lib/errors";
import { firstQueryFailure } from "@/lib/query-errors";

import { transitionPayload, updateEmployeePayload } from "./employee-form-payloads";


export function useEmployeeProfile(employeeId: string) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);

  const employeeQuery = useQuery(workforceQueries.employee(employeeId));
  const periodsQuery = useQuery(workforceQueries.employmentPeriods(employeeId));
  const branchesQuery = useQuery(organizationQueries.branches());
  const departmentsQuery = useQuery(workforceQueries.departments());
  const positionsQuery = useQuery(workforceQueries.positions());

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

  const archiveEmployee = useMutation({
    mutationFn: workforceApi.archiveEmployee,
    onSuccess: async () => {
      await invalidate();
      router.push("/dashboard/employees?section=employees");
    },
  });

  const writeError = updateEmployee.error ?? transitionEmployee.error ?? archiveEmployee.error;
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
    archiveEmployee.reset();
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
    busy: updateEmployee.isPending || transitionEmployee.isPending || archiveEmployee.isPending,
    updateEmployee: (form: HTMLFormElement) => {
      clearFeedback();
      updateEmployee.mutate(updateEmployeePayload(new FormData(form), employeeId));
    },
    transitionEmployee: (form: HTMLFormElement) => {
      clearFeedback();
      transitionEmployee.mutate(transitionPayload(new FormData(form), employeeId));
    },
    archiveEmployee: () => {
      if (
        !employee ||
        !window.confirm(
          `Move ${employee.person.firstName} ${employee.person.lastName} to the archive? ` +
            "You can restore them, or delete them for good, from Employees → Archive.",
        )
      )
        return;
      clearFeedback();
      archiveEmployee.mutate(employeeId);
    },
    retry: loadFailure?.retry,
  };
}
