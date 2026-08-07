"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

import { organizationQueries, reportQueries, reportsApi, workforceQueries } from "@/lib/api";
import { presentRequestError } from "@/lib/errors";
import { firstQueryFailure } from "@/lib/query-errors";
import { detectedTimeZone } from "@/lib/timezone";

import { exportCsv, SUMMARY_CSV_HEADER, summaryCsvRow } from "./export-summary";
import { periodFor, shiftPeriod, type ReportPreset, type ReportRange } from "./period";

import type { AttendanceSummary } from "@/lib/api";

const PAGE_SIZE = 10;
const EXPORT_LIMIT = 500;

export type SummarySort = "name" | "lateDays" | "lateMinutes" | "absentDays" | "attendanceRate";

function todayIn(timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(new Date());
}

export function useAttendanceSummary() {
  const [preset, setPreset] = useState<ReportPreset>("week");
  const [range, setRange] = useState<ReportRange>(() =>
    periodFor("week", todayIn(detectedTimeZone())),
  );
  const [branchId, setBranchId] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SummarySort>("name");
  const [page, setPage] = useState(0);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<unknown>(null);

  const branchesQuery = useQuery(organizationQueries.branches());
  const departmentsQuery = useQuery(workforceQueries.departments());
  const branches = branchesQuery.data ?? [];
  const departments = departmentsQuery.data ?? [];

  const timeZone =
    branches.find((branch) => branch.id === branchId)?.timezone ?? detectedTimeZone();
  const today = todayIn(timeZone);

  useEffect(() => {
    const settle = window.setTimeout(() => {
      setSearch(searchTerm.trim());
      setPage(0);
    }, 300);
    return () => window.clearTimeout(settle);
  }, [searchTerm]);

  const query = {
    from: range.from,
    to: range.to,
    branchId: branchId || undefined,
    departmentId: departmentId || undefined,
    search: search || undefined,
    sort,
    limit: PAGE_SIZE,
    offset: page * PAGE_SIZE,
  };
  const summaryQuery = useQuery({
    ...reportQueries.attendanceSummary(query),
    placeholderData: keepPreviousData,
  });
  const summary: AttendanceSummary | null = summaryQuery.data ?? null;
  const pageCount = summary ? Math.max(1, Math.ceil(summary.total / PAGE_SIZE)) : 1;

  const loadFailure = firstQueryFailure([
    [branchesQuery, "Could not load branches."],
    [departmentsQuery, "Could not load departments."],
    [summaryQuery, "Could not load the attendance summary."],
  ]);
  const error = exportError
    ? presentRequestError(exportError, "Could not export the report.")
    : (loadFailure?.error ?? null);

  function changePreset(next: ReportPreset) {
    setPreset(next);
    setRange(periodFor(next, today));
    setPage(0);
  }

  function movePeriod(step: -1 | 1) {
    setRange(shiftPeriod(range, preset, step));
    setPage(0);
  }

  function goToCurrent() {
    setRange(periodFor(preset, today));
    setPage(0);
  }

  /** Jump straight to the period holding a picked date — no arrow-walking. */
  function jumpToDate(date: string) {
    if (!date) return;
    setRange(periodFor(preset, date));
    setPage(0);
  }

  function changeBranch(next: string) {
    setBranchId(next);
    setDepartmentId("");
    setPage(0);
  }

  function changeDepartment(next: string) {
    setDepartmentId(next);
    setPage(0);
  }

  function changeSort(next: SummarySort) {
    setSort(next);
    setPage(0);
  }

  function changePage(next: number) {
    setPage(Math.min(Math.max(next, 0), pageCount - 1));
  }

  async function exportReport() {
    setExporting(true);
    setExportError(null);
    try {
      const full = await reportsApi.attendanceSummary({
        ...query,
        limit: EXPORT_LIMIT,
        offset: 0,
      });
      exportCsv(
        `attendance-summary-${range.from}-to-${range.to}.csv`,
        SUMMARY_CSV_HEADER,
        full.rows.map(summaryCsvRow),
      );
    } catch (cause) {
      setExportError(cause);
    } finally {
      setExporting(false);
    }
  }

  return {
    preset,
    range,
    canGoNext: range.to < today,
    branches,
    branchId,
    departments,
    departmentId,
    searchTerm,
    sort,
    page,
    pageCount,
    pageSize: PAGE_SIZE,
    summary,
    loading: summaryQuery.isPending,
    refreshing: summaryQuery.isFetching && !summaryQuery.isPending,
    exporting,
    error,
    retry: loadFailure?.retry,
    today,
    changePreset,
    movePeriod,
    goToCurrent,
    jumpToDate,
    changeBranch,
    changeDepartment,
    setSearchTerm,
    changeSort,
    changePage,
    exportReport,
  };
}
