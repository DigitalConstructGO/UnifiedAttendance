"use client";

import { Check, ChevronRight } from "lucide-react";

import { useAccess } from "@/components/access-provider";
import { RequestErrorAlert } from "@/components/request-error-alert";

import { AttendanceNavigation } from "./attendance-navigation";
import { CorrectionsPanel } from "./corrections";
import { DayDetails } from "./day-details";
import { type AttendanceSection, sectionMeta } from "./navigation";
import { RegisterControls } from "./register-controls";
import { RegisterTable } from "./register-table";
import { SummaryCards } from "./summary-cards";
import { useAttendanceRegister } from "./use-attendance-register";

export type { AttendanceSection } from "./navigation";

export function AttendanceWorkspace({ section }: { section: AttendanceSection }) {
  const { can } = useAccess();
  // Corrections is a separate permission, so a link straight to it falls back
  // to the register rather than showing an empty tab.
  const activeSection =
    section === "corrections" && !can("corrections:read") ? "register" : section;
  const showsRegister = activeSection === "register";
  const register = useAttendanceRegister({ registerActive: showsRegister });
  const meta = sectionMeta(activeSection);

  return (
    <div className="mx-auto w-full max-w-[1240px] space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <span>Attendance</span>
            <ChevronRight className="size-3" aria-hidden="true" />
            <span>{meta.label}</span>
          </p>
          <h1 className="text-strong mt-1 font-heading text-2xl font-bold tracking-[-0.03em]">
            {meta.heading}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{meta.description}</p>
        </div>
        <RegisterControls
          branches={register.branches}
          branchId={register.branchId}
          date={register.date}
          showDate={showsRegister}
          onBranchChange={register.changeBranch}
          onDateChange={register.changeDate}
        />
      </header>

      <AttendanceNavigation section={activeSection} />

      {register.notice ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-[11px] bg-success/8 px-4 py-3 text-sm text-success ring-1 ring-success/20"
        >
          <Check className="size-4" aria-hidden="true" />
          {register.notice}
        </div>
      ) : null}
      {register.error ? (
        <RequestErrorAlert error={register.error} onRetry={register.retry} />
      ) : null}

      {showsRegister ? (
        <>
          <SummaryCards counts={register.counts} loading={register.loading} />

          <RegisterTable
            date={register.date}
            rows={register.loading ? [] : register.visibleRows}
            total={register.register?.total ?? 0}
            loading={register.loading}
            filter={register.filter}
            departmentNames={register.departmentNames}
            timeZone={register.timeZone}
            onFilterChange={register.setFilter}
            onSelect={register.setSelectedId}
          />

          {register.selected ? (
            <DayDetails
              row={register.selected}
              canManage={can("attendance:manage")}
              busy={register.busy}
              manualKind={register.manualKind}
              onKindChange={register.setManualKind}
              onClose={() => register.setSelectedId(null)}
              onSubmit={(form) => void register.submitManualEntry(form)}
            />
          ) : null}
        </>
      ) : (
        <CorrectionsPanel branchId={register.branchId} timeZone={register.timeZone} />
      )}
    </div>
  );
}
