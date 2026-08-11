"use client";

import { ChevronRight } from "lucide-react";

import { useAccess } from "@/components/access-provider";
import {
  type EmploymentContractView,
  EmploymentContractsWorkspace,
} from "@/components/employment-contracts";

import { ArchivedPanel } from "./archived-panel";
import { CreateEmployeePanel } from "./create-employee-panel";
import { DepartmentManager } from "./department-manager";
import { EmployeeDirectory } from "./employee-directory";
import { EmployeeNavigation } from "./employee-navigation";
import { BranchOptions, selectClass } from "./fields";
import { sectionMeta } from "./navigation";
import { PositionManager } from "./position-manager";
import { useEmployeeWorkspace } from "./use-employee-workspace";
import type { EmployeeSection } from "./workspace-model";
import { WorkspaceBanners } from "./workspace-banners";

export type { EmployeeSection } from "./workspace-model";

export function EmployeeWorkspace({
  section,
  contractView = "list",
  contractId,
}: {
  section: EmployeeSection;
  contractView?: EmploymentContractView;
  contractId?: string;
}) {
  const { can } = useAccess();
  const workspace = useEmployeeWorkspace();

  const manageable = can("workforce:manage");
  const activeSection = !manageable && section !== "employees" ? "employees" : section;
  const meta = sectionMeta(activeSection);
  const showsBranchPicker =
    activeSection === "employees" || activeSection === "contracts" || activeSection === "archive";

  return (
    <div className="mx-auto w-full max-w-[1240px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <span>Employees</span>
            <ChevronRight className="size-3" aria-hidden="true" />
            <span>{meta.label}</span>
          </p>
          <h1 className="text-strong mt-1 font-heading text-2xl font-bold tracking-[-0.03em]">
            {meta.heading}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{meta.description}</p>
        </div>
        {showsBranchPicker ? (
          <label className="text-strong grid min-w-48 gap-1.5 text-xs font-bold">
            Branch
            <select
              className={selectClass}
              value={workspace.branchId}
              onChange={(event) => workspace.changeBranch(event.target.value)}
            >
              <BranchOptions branches={workspace.catalogs.branches} />
            </select>
          </label>
        ) : null}
      </header>

      <EmployeeNavigation section={activeSection} manageable={manageable} />

      <WorkspaceBanners
        notice={workspace.notice}
        error={workspace.error}
        onRetry={workspace.retry}
      />

      {activeSection === "employees" ? (
        <EmployeeDirectory employees={workspace.employees} manageable={manageable} />
      ) : null}

      {activeSection === "create" ? (
        <CreateEmployeePanel
          catalogs={workspace.catalogs}
          branchId={workspace.branchId}
          busy={workspace.busy}
          onBranchChange={workspace.setBranchId}
          onSubmit={workspace.createEmployee}
        />
      ) : null}

      {activeSection === "departments" ? (
        <div className="grid items-start gap-5 lg:grid-cols-2">
          <DepartmentManager branches={workspace.catalogs.branches} />
          <PositionManager />
        </div>
      ) : null}

      {activeSection === "archive" ? <ArchivedPanel branchId={workspace.branchId} /> : null}

      {activeSection === "contracts" ? (
        <EmploymentContractsWorkspace
          employees={workspace.employees}
          manageable={manageable}
          view={contractView}
          contractId={contractId}
        />
      ) : null}
    </div>
  );
}
