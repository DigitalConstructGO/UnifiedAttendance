"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  type EmployeeRow,
  organizationQueries,
  workforceApi,
  workforceKeys,
  workforceQueries,
} from "@/lib/api";
import { presentRequestError } from "@/lib/errors";
import { firstQueryFailure } from "@/lib/query-errors";

import {
  createEmployeePayload,
  transitionPayload,
  updateEmployeePayload,
} from "./employee-form-payloads";

/**
 * Owns every piece of employee-workspace state and the API calls that mutate it.
 * Sections receive plain data and callbacks; none of them touch the API directly.
 *
 * The selected employee is held as an id, not a row, so the details panel
 * re-reads it from the directory cache after each write instead of showing the
 * copy that was current when the row was clicked.
 */
export function useEmployeeWorkspace() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [chosenBranchId, setChosenBranchId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const branchesQuery = useQuery(organizationQueries.branches());
  const departmentsQuery = useQuery(workforceQueries.departments());
  const positionsQuery = useQuery(workforceQueries.positions());

  const branches = branchesQuery.data ?? [];
  const branchId = chosenBranchId || branches[0]?.id || "";

  const employeesQuery = useQuery(workforceQueries.employees(branchId));
  const employees = employeesQuery.data ?? [];
  const selected = employees.find((row) => row.employee.id === selectedId) ?? null;

  const periodsQuery = useQuery(workforceQueries.employmentPeriods(selectedId ?? ""));

  async function invalidateDirectory() {
    await queryClient.invalidateQueries({ queryKey: workforceKeys.employeesAll });
  }

  const createEmployee = useMutation({
    mutationFn: workforceApi.createEmployee,
    onSuccess: async () => {
      setNotice("Employee created with an initial employment period.");
      await invalidateDirectory();
      router.push("/dashboard/employees?section=employees");
    },
  });

  const updateEmployee = useMutation({
    mutationFn: workforceApi.updateEmployee,
    onSuccess: async () => {
      setNotice("Employee details updated.");
      await invalidateDirectory();
    },
  });

  const transitionEmployee = useMutation({
    mutationFn: workforceApi.transitionEmployment,
    onSuccess: async () => {
      setNotice("Employment transition saved.");
      await invalidateDirectory();
    },
  });

  const deleteEmployee = useMutation({
    mutationFn: workforceApi.deleteEmployee,
    onSuccess: async () => {
      setSelectedId(null);
      setNotice("Employee deleted.");
      await invalidateDirectory();
    },
  });

  const writeError =
    createEmployee.error ??
    updateEmployee.error ??
    transitionEmployee.error ??
    deleteEmployee.error;
  const loadFailure = firstQueryFailure([
    [branchesQuery, "Could not load branches."],
    [departmentsQuery, "Could not load departments."],
    [positionsQuery, "Could not load positions."],
    [employeesQuery, "Could not load employees."],
    [periodsQuery, "Could not load employment history."],
  ]);
  const error = writeError
    ? presentRequestError(writeError, "Could not complete the employee action.")
    : (loadFailure?.error ?? null);

  function changeBranch(nextBranchId: string) {
    setChosenBranchId(nextBranchId);
    setSelectedId(null);
  }

  /** Clears the banner and any previous write failure so one action reports one result. */
  function clearFeedback() {
    setNotice(null);
    createEmployee.reset();
    updateEmployee.reset();
    transitionEmployee.reset();
    deleteEmployee.reset();
  }

  return {
    catalogs: {
      branches,
      departments: departmentsQuery.data ?? [],
      positions: positionsQuery.data ?? [],
    },
    employees,
    branchId,
    selected,
    periods: periodsQuery.data ?? [],
    notice,
    error,
    busy:
      createEmployee.isPending ||
      updateEmployee.isPending ||
      transitionEmployee.isPending ||
      deleteEmployee.isPending,
    setBranchId: setChosenBranchId,
    changeBranch,
    selectEmployee: (employee: EmployeeRow) => {
      clearFeedback();
      setSelectedId(employee.employee.id);
    },
    createEmployee: (form: HTMLFormElement) => {
      clearFeedback();
      createEmployee.mutate(createEmployeePayload(new FormData(form)), {
        onSuccess: () => form.reset(),
      });
    },
    updateEmployee: (form: HTMLFormElement) => {
      if (!selected) return;
      clearFeedback();
      updateEmployee.mutate(updateEmployeePayload(new FormData(form), selected.employee.id));
    },
    transitionEmployee: (form: HTMLFormElement) => {
      if (!selected) return;
      clearFeedback();
      transitionEmployee.mutate(transitionPayload(new FormData(form), selected.employee.id));
    },
    deleteEmployee: () => {
      if (
        !selected ||
        !window.confirm(`Delete ${selected.person.firstName} ${selected.person.lastName}?`)
      )
        return;
      clearFeedback();
      deleteEmployee.mutate(selected.employee.id);
    },
    retry: loadFailure?.retry,
  };
}
