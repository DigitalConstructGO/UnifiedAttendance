"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";

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

import {
  EMPTY_COUNTS,
  type ManualKind,
  needsTime,
  type QuickKind,
  type RegisterFilter,
  type RegisterRow,
} from "./register-model";
import { formatTime, localDateTimeToIso, today } from "./register-presentation";

const REGISTER_PAGE_SIZE = 10;

export function useAttendanceRegister({ registerActive = true } = {}) {
  const queryClient = useQueryClient();
  const [chosenBranchId, setChosenBranchId] = useState("");
  const [chosenDate, setChosenDate] = useState<string | null>(null);
  const [page, setPage] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<RegisterFilter>("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [manualKind, setManualKind] = useState<ManualKind>("check_in");
  const [quickEmployeeId, setQuickEmployeeId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const branchesQuery = useQuery(organizationQueries.branches());
  const departmentsQuery = useQuery(workforceQueries.departments());

  const branches = branchesQuery.data ?? [];
  const departments = departmentsQuery.data ?? [];
  const branchId = chosenBranchId || branches[0]?.id || "";
  const timeZone =
    branches.find((branch) => branch.id === branchId)?.timezone ?? detectedTimeZone();
  const date = chosenDate ?? today(timeZone);
  const isToday = date === today(timeZone);
  const isFuture = date > today(timeZone);

  useEffect(() => {
    const settle = window.setTimeout(() => {
      setSearch(searchTerm.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(settle);
  }, [searchTerm]);

  const registerQuery = useQuery({
    ...attendanceQueries.register({
      branchId,
      date,
      search: search || undefined,
      // The server classifies the whole branch, so the filter and the summary
      // counts describe every employee — not whichever page happens to load.
      status: filter === "all" ? undefined : filter,
      limit: REGISTER_PAGE_SIZE,
      offset: page * REGISTER_PAGE_SIZE,
    }),
    enabled: registerActive && branchId.length > 0,

    placeholderData: keepPreviousData,
  });
  const register = registerQuery.data ?? null;
  const pageCount = register ? Math.max(1, Math.ceil(register.total / REGISTER_PAGE_SIZE)) : 1;

  const manualEntry = useMutation({
    mutationFn: attendanceApi.createManualEntry,
    onSuccess: async () => {
      setNotice("Manual attendance entry recorded and the day was recalculated.");
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
  const counts = register?.counts ?? EMPTY_COUNTS;
  const visibleRows = register?.rows ?? [];
  const selected = register?.rows.find((row) => row.employee.id === selectedId) ?? null;

  function changeFilter(next: RegisterFilter) {
    setFilter(next);
    setPage(0);
    setSelectedId(null);
  }

  function changeBranch(nextBranchId: string) {
    setChosenBranchId(nextBranchId);
    setPage(0);
    setFilter("all");
    setSelectedId(null);
  }

  function changeDate(nextDate: string) {
    setChosenDate(nextDate);
    setPage(0);
    setFilter("all");
    setSelectedId(null);
  }

  function changePage(nextPage: number) {
    setPage(Math.min(Math.max(nextPage, 0), pageCount - 1));
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
      return;
    }
  }

  async function recordQuickEntry(row: RegisterRow, kind: QuickKind, time: string) {
    const occurredAt = localDateTimeToIso(date, time, timeZone);
    setNotice(null);
    setQuickEmployeeId(row.employee.id);
    try {
      await manualEntry.mutateAsync({
        employeeId: row.employee.id,
        attendanceDate: date,
        kind,
        occurredAt,
      });
      const name = `${row.person.firstName} ${row.person.lastName}`;
      setNotice(
        `Checked ${name} ${kind === "check_in" ? "in" : "out"} at ${formatTime(occurredAt, timeZone)}.`,
      );
    } catch {
      return;
    } finally {
      setQuickEmployeeId(null);
    }
  }

  return {
    branches,
    branchId,
    timeZone,
    date,
    isToday,
    isFuture,
    register,
    page,
    pageCount,
    pageSize: REGISTER_PAGE_SIZE,
    searchTerm,
    setSearchTerm,
    filter,
    selected,
    manualKind,
    notice,
    error,
    loading:
      branchesQuery.isPending || (registerActive && branchId !== "" && registerQuery.isPending),
    refreshing: registerQuery.isFetching && !registerQuery.isPending,
    busy: manualEntry.isPending,
    quickEmployeeId,
    counts,
    visibleRows,
    departmentNames,
    setFilter: changeFilter,
    setSelectedId,
    setManualKind,
    changeBranch,
    changeDate,
    changePage,
    submitManualEntry,
    recordQuickEntry,
    retry: loadFailure?.retry,
  };
}
