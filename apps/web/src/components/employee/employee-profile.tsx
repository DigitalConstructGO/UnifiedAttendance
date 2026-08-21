"use client";

import { ArrowLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useAccess } from "@/components/access-provider";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
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
  const [confirmingArchive, setConfirmingArchive] = useState(false);

  return (
    <div className="mx-auto w-full max-w-[1240px] space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-1 text-xs font-semibold text-muted-foreground">
              <li>
                <Link
                  href="/dashboard/employees?section=employees"
                  className="hover:text-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  prefetch={false}
                >
                  Employees
                </Link>
              </li>
              <li aria-hidden="true">
                <ChevronRight className="size-3" />
              </li>
              <li aria-current="page" className="text-strong">
                {fullName ?? "Employee profile"}
              </li>
            </ol>
          </nav>
          {employee ? (
            <div className="mt-3 flex items-center gap-4">
              {employee.personAssets.profilePhotoUrl ? (
                <img
                  src={employee.personAssets.profilePhotoUrl}
                  alt=""
                  className="size-14 shrink-0 rounded-[11px] object-cover ring-1 ring-border"
                />
              ) : (
                <span
                  className="grid size-14 shrink-0 place-items-center rounded-[11px] bg-primary/10 text-lg font-bold text-primary"
                  aria-hidden="true"
                >
                  {employee.person.firstName[0]}
                  {employee.person.lastName[0]}
                </span>
              )}
              <div className="min-w-0">
                <h1 className="text-strong font-heading text-2xl font-bold tracking-[-0.03em]">
                  {fullName}
                </h1>
                <dl className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <div className="flex items-baseline gap-1">
                    <dt>Employee ID</dt>
                    <dd className="text-strong font-numeric font-bold">
                      {employee.employee.employeeCode}
                    </dd>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <dt>Department</dt>
                    <dd className="text-strong font-semibold">
                      {employee.department?.name ?? "Not assigned"}
                    </dd>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <dt>Position</dt>
                    <dd className="text-strong font-semibold">
                      {employee.position?.title ?? "Not assigned"}
                    </dd>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <dt>Employment</dt>
                    <dd className="text-strong font-semibold">
                      {employmentLabel(employee.employee.employmentType)}
                    </dd>
                  </div>
                  <div>
                    <dt className="sr-only">Status</dt>
                    <dd>
                      <span className={EMPLOYEE_STATUS_META[employee.employee.status].badgeClass}>
                        {EMPLOYEE_STATUS_META[employee.employee.status].label}
                      </span>
                    </dd>
                  </div>
                </dl>
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
          <p className="text-xs text-muted-foreground">Loading employee profile…</p>
        </div>
      ) : null}

      {employee ? (
        <EmployeeDetails
          selected={employee}
          periods={profile.periods}
          catalogs={profile.catalogs}
          manageable={manageable}
          busy={profile.busy}
          updating={profile.updating}
          onUpdate={profile.updateEmployee}
          onTransition={profile.transitionEmployee}
          onDelete={() => setConfirmingArchive(true)}
        />
      ) : null}

      {confirmingArchive ? (
        <ConfirmDialog
          title={`Archive ${fullName ?? "this employee"}?`}
          description="This removes the employee from the active directory, attendance register, and reports. Their profile and history are kept and can be restored from Archived employees."
          confirmLabel="Archive employee"
          onCancel={() => setConfirmingArchive(false)}
          onConfirm={() => {
            profile.archiveEmployee();
            setConfirmingArchive(false);
          }}
        />
      ) : null}
    </div>
  );
}
