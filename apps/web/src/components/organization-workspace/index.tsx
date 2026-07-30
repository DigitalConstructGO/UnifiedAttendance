"use client";

import { Check, LoaderCircle } from "lucide-react";

import { RequestErrorAlert } from "@/components/request-error-alert";
import { BranchesTab } from "./branches-tab";
import { HolidaysTab } from "./holidays-tab";
import { OverviewTab } from "./overview-tab";
import { ScheduleTab } from "./schedule-tab";
import { useOrganizationWorkspace } from "./use-organization-workspace";
import { WorkspaceTabs } from "./workspace-tabs";

export function OrganizationWorkspace() {
  const workspace = useOrganizationWorkspace();

  if (!workspace.organization) {
    return (
      <div className="mx-auto flex min-h-64 w-full max-w-5xl items-center justify-center">
        {workspace.error ? (
          <RequestErrorAlert error={workspace.error} onRetry={workspace.retry} focusOnError />
        ) : (
          <LoaderCircle className="animate-spin text-primary" aria-label="Loading organization" />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header>
        <p className="text-xs font-semibold text-muted-foreground">Workspace administration</p>
        <h1 className="text-strong mt-1 font-heading text-2xl font-bold tracking-[-0.03em]">
          Organization settings
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Manage the shared context that keeps attendance records consistent.
        </p>
      </header>

      <WorkspaceTabs activeTab={workspace.tab} onChange={workspace.selectTab} />

      {workspace.notice ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-[11px] bg-success/8 px-4 py-3 text-sm text-success ring-1 ring-success/20"
        >
          <Check className="size-4" />
          {workspace.notice}
        </div>
      ) : null}
      {workspace.error ? (
        <RequestErrorAlert error={workspace.error} onRetry={workspace.retry} />
      ) : null}

      {workspace.tab === "overview" ? (
        <OverviewTab
          name={workspace.name}
          code={workspace.code}
          timezone={workspace.timezone}
          busy={workspace.busy}
          onNameChange={workspace.setName}
          onCodeChange={workspace.setCode}
          onTimezoneChange={workspace.setTimezone}
          onSave={workspace.saveOrganization}
        />
      ) : null}
      {workspace.tab === "branches" ? (
        <BranchesTab
          branches={workspace.branches}
          draft={workspace.branchDraft}
          busy={workspace.busy}
          onDraftChange={workspace.setBranchDraft}
          onSubmit={workspace.saveBranch}
          onManageSchedule={(branchId) => {
            workspace.setSelectedBranch(branchId);
            workspace.selectTab("schedule");
          }}
        />
      ) : null}
      {workspace.tab === "schedule" ? (
        <ScheduleTab
          branches={workspace.branches}
          selectedBranch={workspace.selectedBranch}
          days={workspace.days}
          busy={workspace.busy}
          onBranchChange={workspace.setSelectedBranch}
          onDaysChange={workspace.setDays}
          onSave={workspace.saveDays}
        />
      ) : null}
      {workspace.tab === "holidays" ? (
        <HolidaysTab
          branches={workspace.branches}
          holidays={workspace.holidays}
          busy={workspace.busy}
          onSubmit={workspace.addHoliday}
          onDelete={workspace.deleteHoliday}
        />
      ) : null}
    </div>
  );
}
