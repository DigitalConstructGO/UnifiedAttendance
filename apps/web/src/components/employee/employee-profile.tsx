"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

import { useAccess } from "@/components/access-provider";
import { Button } from "@/components/ui/button";
import { EMPLOYEE_STATUS_META, employmentLabel } from "@/lib/workforce-presentation";

import { EmployeeDetails } from "./employee-details";
import { useEmployeeProfile } from "./use-employee-profile";
import { WorkspaceBanners } from "./workspace-banners";

export function EmployeeProfile({ employeeId }: { employeeId: string }) {
  const { can } = useAccess();
  const profile = useEmployeeProfile(employeeId);
  const manageable = can("employees.update");
  const employee = profile.employee;
  const fullName = employee ? `${employee.person.firstName} ${employee.person.lastName}` : null;

  return (
    <div className="mx-auto w-full max-w-[1240px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
            <span>Employees</span>
            <ChevronRight className="size-3" aria-hidden="true" />
            <span>{fullName ?? "Profile"}</span>
          </p>
          {employee ? (
            <div className="mt-3 flex items-center gap-4">
              <span
                className="grid size-14 shrink-0 place-items-center rounded-[11px] bg-primary/10 text-lg font-bold text-primary"
                aria-hidden="true"
              >
                {employee.person.firstName[0]}
                {employee.person.lastName[0]}
              </span>
              <div>
                <h1 className="text-strong font-heading text-2xl font-bold tracking-[-0.03em]">
                  {fullName}
                </h1>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
                  <span className="font-numeric font-bold">{employee.employee.employeeCode}</span>
                  <span aria-hidden="true">·</span>
                  <span>
                    {employee.department?.name ?? "No department"}
                    {employee.position ? ` — ${employee.position.title}` : ""}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>{employmentLabel(employee.employee.employmentType)}</span>
                  <span className={EMPLOYEE_STATUS_META[employee.employee.status].badgeClass}>
                    {EMPLOYEE_STATUS_META[employee.employee.status].label}
                  </span>
                </p>
              </div>
            </div>
          ) : (
            <h1 className="text-strong mt-1 font-heading text-2xl font-bold tracking-[-0.03em]">
              Employee profile
            </h1>
          )}
        </div>
        <Button asChild variant="outline" className="h-9 rounded-[9px] px-3">
          <Link href="/dashboard/employees?section=employees" prefetch={false}>
            <ArrowLeft aria-hidden="true" />
            All employees
          </Link>
        </Button>
      </header>

      <WorkspaceBanners notice={profile.notice} error={profile.error} onRetry={profile.retry} />

      {profile.loading ? (
        <div className="grid min-h-48 place-items-center" role="status">
          <p className="text-xs text-muted-foreground">Loading the employee…</p>
        </div>
      ) : null}

      {employee ? (
        <EmployeeDetails
          selected={employee}
          periods={profile.periods}
          catalogs={profile.catalogs}
          manageable={manageable}
          busy={profile.busy}
          onUpdate={profile.updateEmployee}
          onTransition={profile.transitionEmployee}
          onDelete={profile.archiveEmployee}
        />
      ) : null}
    </div>
  );
}
