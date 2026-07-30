"use client";

import { Check } from "lucide-react";

import { useAccess } from "@/components/access-provider";
import { RequestErrorAlert } from "@/components/request-error-alert";

import { DayDetails } from "./day-details";
import { RegisterControls } from "./register-controls";
import { RegisterTable } from "./register-table";
import { SummaryCards } from "./summary-cards";
import { useAttendanceRegister } from "./use-attendance-register";

export function AttendanceWorkspace() {
  const { can } = useAccess();
  const register = useAttendanceRegister();

  return (
    <div className="mx-auto w-full max-w-[1240px] space-y-5">
      <RegisterControls
        branches={register.branches}
        branchId={register.branchId}
        date={register.date}
        onBranchChange={register.changeBranch}
        onDateChange={register.changeDate}
      />

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
    </div>
  );
}
