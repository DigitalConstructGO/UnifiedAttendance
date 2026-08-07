"use client";

import { ChevronRight } from "lucide-react";

import { RequestErrorAlert } from "@/components/request-error-alert";

import { type ReportsSection, sectionMeta } from "./navigation";
import { SummaryCharts } from "./summary-charts";
import { SummaryControls } from "./summary-controls";
import { SummaryTable } from "./summary-table";
import { SummaryTotals } from "./summary-totals";
import { useAttendanceSummary } from "./use-attendance-summary";

export type { ReportsSection } from "./navigation";

export function ReportsWorkspace({ section }: { section: ReportsSection }) {
  const report = useAttendanceSummary();
  const meta = sectionMeta(section);

  return (
    <div className="mx-auto w-full max-w-[1240px] space-y-5">
      <header>
        <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
          <span>Reports</span>
          <ChevronRight className="size-3" aria-hidden="true" />
          <span>{meta.label}</span>
        </p>
        <h1 className="text-strong mt-1 font-heading text-2xl font-bold tracking-[-0.03em]">
          {meta.heading}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">{meta.description}</p>
      </header>

      {report.error ? <RequestErrorAlert error={report.error} onRetry={report.retry} /> : null}

      <SummaryControls
        preset={report.preset}
        range={report.range}
        today={report.today}
        canGoNext={report.canGoNext}
        branches={report.branches}
        branchId={report.branchId}
        departments={report.departments}
        departmentId={report.departmentId}
        searchTerm={report.searchTerm}
        exporting={report.exporting}
        hasRows={(report.summary?.total ?? 0) > 0}
        onPresetChange={report.changePreset}
        onMove={report.movePeriod}
        onCurrent={report.goToCurrent}
        onJumpToDate={report.jumpToDate}
        onBranchChange={report.changeBranch}
        onDepartmentChange={report.changeDepartment}
        onSearchChange={report.setSearchTerm}
        onExport={() => void report.exportReport()}
      />

      <SummaryTotals totals={report.summary?.totals ?? null} loading={report.loading} />

      <SummaryCharts
        byDay={report.summary?.byDay ?? []}
        preset={report.preset}
        loading={report.loading}
      />

      <SummaryTable
        preset={report.preset}
        range={report.range}
        rows={report.loading ? [] : (report.summary?.rows ?? [])}
        total={report.summary?.total ?? 0}
        page={report.page}
        pageCount={report.pageCount}
        pageSize={report.pageSize}
        loading={report.loading}
        sort={report.sort}
        onSortChange={report.changeSort}
        onPageChange={report.changePage}
      />
    </div>
  );
}
