"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import {
  attendanceApi,
  attendanceKeys,
  attendanceQueries,
  organizationQueries,
  workforceQueries,
} from "@/lib/api";
import { presentRequestError } from "@/lib/errors";
import { firstQueryFailure } from "@/lib/query-errors";
import { detectedTimeZone } from "@/lib/timezone";

import { EMPTY_COUNTS, type ManualKind, needsTime, type RegisterFilter } from "./register-model";
import { localDateTimeToIso, registerStatus, today } from "./register-presentation";

const REGISTER_PAGE_SIZE = 200;

export function useAttendanceRegister() {
  const queryClient = useQueryClient();
  const [chosenBranchId, setChosenBranchId] = useState("");
  const [chosenDate, setChosenDate] = useState<string | null>(null);
  const [filter, setFilter] = useState<RegisterFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [manualKind, setManualKind] = useState<ManualKind>("check_in");
  const [notice, setNotice] = useState<string | null>(null);

  const branchesQuery = useQuery(organizationQueries.branches());
  const departmentsQuery = useQuery(workforceQueries.departments());

  const branches = branchesQuery.data ?? [];
  const departments = departmentsQuery.data ?? [];
  const branchId = chosenBranchId || branches[0]?.id || "";
  const timeZone =
    branches.find((branch) => branch.id === branchId)?.timezone ?? detectedTimeZone();
  const date = chosenDate ?? today(timeZone);

  const registerQuery = useQuery(
    attendanceQueries.register({ branchId, date, limit: REGISTER_PAGE_SIZE, offset: 0 }),
  );
  const register = registerQuery.data ?? null;

  const manualEntry = useMutation({
    mutationFn: attendanceApi.createManualEntry,
    onSuccess: async () => {
      setNotice("Manual attendance entry recorded and the day was recalculated.");
      // The entry recomputes the day, so every attendance read is now stale.
      await queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
    },
  });

  const loadFailure = firstQueryFailure([
    [branchesQuery, "Could not load branches."],
    [departmentsQuery, "Could not load departments."],
    [registerQuery, "Could not load the attendance register."],
  ]);
  const error = manualEntry.error
    ? presentRequestError(manualEntry.error, "Could not record the attendance entry.")
    : (loadFailure?.error ?? null);

  const departmentNames = new Map(
    departments.map((department) => [department.id, department.name]),
  );
  const statusRows = register?.rows.map((row) => ({ row, status: registerStatus(row) })) ?? [];
  const counts = { ...EMPTY_COUNTS };
  for (const item of statusRows) counts[item.status] += 1;
  const visibleRows = statusRows
    .filter((item) => filter === "all" || item.status === filter)
    .map((item) => item.row);
  const selected = register?.rows.find((row) => row.employee.id === selectedId) ?? null;

  function changeBranch(nextBranchId: string) {
    setChosenBranchId(nextBranchId);
    setFilter("all");
    setSelectedId(null);
  }

  function changeDate(nextDate: string) {
    setChosenDate(nextDate);
    setFilter("all");
    setSelectedId(null);
  }

  async function submitManualEntry(form: HTMLFormElement) {
    if (!selected) return;
    const data = new FormData(form);
    const time = needsTime(manualKind) ? String(data.get("time") ?? "") : "";
    setNotice(null);
    try {
      await manualEntry.mutateAsync({
        employeeId: selected.employee.id,
        attendanceDate: date,
        kind: manualKind,
        occurredAt: time ? localDateTimeToIso(date, time, timeZone) : undefined,
        reason: String(data.get("reason")),
      });
      form.reset();
    } catch {
    }
  }

  return {
    branches,
    branchId,
    timeZone,
    date,
    register,
    filter,
    selected,
    manualKind,
    notice,
    error,
    loading: branchesQuery.isPending || (branchId !== "" && registerQuery.isPending),
    busy: manualEntry.isPending,
    counts,
    visibleRows,
    departmentNames,
    setFilter,
    setSelectedId,
    setManualKind,
    changeBranch,
    changeDate,
    submitManualEntry,
    retry: loadFailure?.retry,
  };
}
