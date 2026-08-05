"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Fingerprint } from "lucide-react";
import { useState } from "react";

import { RequestErrorAlert } from "@/components/request-error-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { devicesApi, devicesQueries, workforceQueries } from "@/lib/api";
import { personName } from "@/lib/client-presentation";
import { presentRequestError } from "@/lib/errors";
import { formatDate } from "@/lib/format-date";

import { today } from "../attendance/register-presentation";
import { isCurrentEnrolment } from "./device-presentation";

export function Enrolments({ branchId, timeZone }: { branchId: string; timeZone: string }) {
  const queryClient = useQueryClient();
  /** Held with its branch, so switching branch drops the selection during render. */
  const [choice, setChoice] = useState({ branchId: "", employeeId: "" });
  const [notice, setNotice] = useState<string | null>(null);

  const employeeId = choice.branchId === branchId ? choice.employeeId : "";

  const employeesQuery = useQuery(workforceQueries.employees(branchId));
  const employees = employeesQuery.data ?? [];
  const selected = employees.find((row) => row.employee.id === employeeId) ?? null;
  const employeeName = selected ? personName(selected.person) : "";

  const identitiesQuery = useQuery(devicesQueries.identities(employeeId));
  const identities = identitiesQuery.data ?? [];
  const current = identities.find(isCurrentEnrolment) ?? null;

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: ["device-identities"] });
  }

  const assign = useMutation({
    mutationFn: devicesApi.assignIdentity,
    onSuccess: async (identity) => {
      setNotice(`Badge ${identity.deviceIdentityNumber} now belongs to ${employeeName}.`);
      await refresh();
    },
  });

  const close = useMutation({
    mutationFn: devicesApi.closeIdentity,
    onSuccess: async () => {
      setNotice("Badge released. Punches from it will no longer match this employee.");
      await refresh();
    },
  });

  const writeError = assign.error ?? close.error;
  const error = writeError
    ? presentRequestError(writeError, "Could not change the enrolment.")
    : employeesQuery.isError
      ? presentRequestError(employeesQuery.error, "Could not load this branch's employees.")
      : identitiesQuery.isError
        ? presentRequestError(identitiesQuery.error, "Could not load enrolments.")
        : null;

  return (
    <div className="grid gap-5">
      <div className="grid max-w-md gap-1.5">
        <span className="text-strong text-xs font-bold">Employee</span>
        <Select
          value={employeeId}
          disabled={employeesQuery.isPending}
          onValueChange={(next) => {
            setChoice({ branchId, employeeId: String(next) });
            setNotice(null);
          }}
          items={employees.map((row) => ({
            label: `${personName(row.person)} · ${row.employee.employeeCode}`,
            value: row.employee.id,
          }))}
        >
          <SelectTrigger aria-label="Employee">
            <SelectValue
              className="text-strong font-semibold"
              placeholder={employeesQuery.isPending ? "Loading employees…" : "Select an employee"}
            />
          </SelectTrigger>
          <SelectContent className="max-h-72">
            {employees.map((row) => (
              <SelectItem key={row.employee.id} value={row.employee.id}>
                {personName(row.person)} · {row.employee.employeeCode}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {error ? <RequestErrorAlert error={error} focusOnError /> : null}
      {notice ? (
        <p
          role="status"
          className="rounded-[11px] bg-success/8 px-4 py-3 text-xs font-semibold text-success"
        >
          {notice}
        </p>
      ) : null}

      {!employeeId ? (
        <div className="grid place-items-center gap-2 rounded-[18px] bg-card px-6 py-14 text-center shadow-[var(--shadow-card)] ring-1 ring-border">
          <span className="grid size-11 place-items-center rounded-[11px] bg-[var(--surface-subtle)] text-muted-foreground">
            <Fingerprint className="size-5" aria-hidden="true" />
          </span>
          <p className="text-strong mt-2 text-sm font-bold">Choose an employee</p>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            A reader only sends a badge number. The enrolment is what turns that number into a
            person, so an unenrolled badge produces punches nobody is credited for.
          </p>
        </div>
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-[18px] bg-card shadow-[var(--shadow-card)] ring-1 ring-border">
            <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <h2 className="text-strong font-heading text-base font-bold">Badge history</h2>
              <span className="font-heading text-xs font-semibold text-muted-foreground tabular-nums">
                {identities.length}
              </span>
            </header>

            {identitiesQuery.isPending ? (
              <div className="grid gap-3 p-5" aria-hidden="true">
                {[0, 1].map((row) => (
                  <Skeleton key={row} className="h-12 w-full rounded-[9px]" />
                ))}
              </div>
            ) : identities.length === 0 ? (
              <div className="grid place-items-center gap-2 px-6 py-12 text-center">
                <p className="text-strong text-sm font-bold">No badge enrolled</p>
                <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
                  {employeeName} cannot be recognised by any reader until a badge number is
                  assigned.
                </p>
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {identities.map((identity) => {
                  const active = isCurrentEnrolment(identity);
                  return (
                    <li key={identity.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                          <span className="text-strong font-heading text-sm font-bold tabular-nums">
                            {identity.deviceIdentityNumber}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 rounded-[7px] px-2 py-0.5 text-[0.6875rem] font-bold ${
                              active
                                ? "bg-success/10 text-success"
                                : "bg-muted text-muted-foreground"
                            }`}
                          >
                            <span
                              className={`size-1.5 rounded-full ${active ? "bg-success" : "bg-muted-foreground"}`}
                              aria-hidden="true"
                            />
                            {active ? "In use" : "Released"}
                          </span>
                        </div>
                        <p className="mt-1 font-heading text-xs text-muted-foreground tabular-nums">
                          {formatDate(identity.validFrom, timeZone)} —{" "}
                          {identity.validTo ? formatDate(identity.validTo, timeZone) : "present"}
                        </p>
                      </div>

                      {active ? (
                        <Button
                          type="button"
                          variant="outline"
                          disabled={close.isPending}
                          onClick={() => {
                            setNotice(null);
                            close.mutate({ id: identity.id, validTo: today(timeZone) });
                          }}
                          className="h-9 shrink-0 rounded-[9px] px-3 text-xs font-bold text-destructive hover:bg-destructive/8 hover:text-destructive"
                        >
                          Release
                        </Button>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="rounded-[18px] bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-border lg:sticky lg:top-[86px]">
            <h2 className="text-strong font-heading text-base font-bold">Enrol a badge</h2>
            <p className="mt-1 mb-4 text-xs text-muted-foreground">For {employeeName}</p>

            <form
              className="grid gap-4"
              onSubmit={(event) => {
                event.preventDefault();
                const data = new FormData(event.currentTarget);
                setNotice(null);
                assign.mutate({
                  employeeId,
                  deviceIdentityNumber: String(data.get("deviceIdentityNumber")).trim(),
                  validFrom: String(data.get("validFrom")),
                  validTo: null,
                });
                event.currentTarget.reset();
              }}
            >
              <label className="text-strong grid gap-2 text-xs font-bold">
                Badge number
                <Input
                  required
                  name="deviceIdentityNumber"
                  placeholder="As enrolled on the reader"
                  className="h-10 rounded-[11px] bg-background font-heading text-xs tabular-nums"
                />
              </label>

              <label className="text-strong grid gap-2 text-xs font-bold">
                In force from
                <Input
                  required
                  type="date"
                  name="validFrom"
                  defaultValue={today(timeZone)}
                  className="h-10 rounded-[11px] bg-background text-xs"
                />
              </label>

              {current ? (
                <p className="rounded-[11px] bg-warning/10 px-3 py-2.5 text-xs leading-relaxed text-warning">
                  {employeeName} still holds badge{" "}
                  <span className="font-heading font-bold tabular-nums">
                    {current.deviceIdentityNumber}
                  </span>
                  . Release it first, or two badges will both count as them.
                </p>
              ) : null}

              <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
                <p className="text-xs text-muted-foreground">Past punches keep their old badge.</p>
                <Button
                  disabled={assign.isPending}
                  className="h-10 shrink-0 rounded-[11px] px-5 font-bold"
                >
                  {assign.isPending ? "Enrolling…" : "Enrol badge"}
                </Button>
              </div>
            </form>
          </section>
        </div>
      )}
    </div>
  );
}
