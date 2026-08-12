"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ClipboardCheck, ScrollText } from "lucide-react";
import { useState } from "react";

import { useAccess } from "@/components/access-provider";
import { RequestErrorAlert } from "@/components/request-error-alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { correctionsApi, correctionsQueries, workforceQueries } from "@/lib/api";
import { presentRequestError } from "@/lib/errors";
import { personName } from "@/lib/client-presentation";
import { DEFAULT_TIME_ZONE } from "@/lib/timezone";

import { CorrectionEntry } from "./correction-entry";
import { CorrectionForm } from "./correction-form";
import { CORRECTION_TYPE_META, type CorrectionType } from "./correction-presentation";

export function CorrectionsPanel({
  branchId,
  timeZone = DEFAULT_TIME_ZONE,
}: {
  branchId: string;
  timeZone?: string;
}) {
  const { can } = useAccess();
  const queryClient = useQueryClient();

  const [choice, setChoice] = useState({ branchId: "", employeeId: "" });
  const [notice, setNotice] = useState<string | null>(null);
  const [undoing, setUndoing] = useState<{ id: string; type: CorrectionType } | null>(null);

  const employeeId = choice.branchId === branchId ? choice.employeeId : "";
  const manageable = can("corrections.create");

  const employeesQuery = useQuery(workforceQueries.employees(branchId));
  const employees = employeesQuery.data ?? [];
  const selected = employees.find((row) => row.employee.id === employeeId) ?? null;
  const employeeName = selected ? personName(selected.person) : "";

  const correctionsQuery = useQuery(correctionsQueries.list({ employeeId }));
  const corrections = correctionsQuery.data ?? [];

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["corrections"] }),
      queryClient.invalidateQueries({ queryKey: ["attendance"] }),
    ]);
  }

  const applyCorrection = useMutation({
    mutationFn: correctionsApi.create,
    onSuccess: async (correction) => {
      setNotice(
        `${CORRECTION_TYPE_META[correction.type].label} applied. The attendance day has been recalculated.`,
      );
      await refresh();
    },
  });

  const undoCorrection = useMutation({
    mutationFn: correctionsApi.remove,
    onSuccess: async () => {
      setNotice("Correction undone. The attendance day is back to what the records say.");
      await refresh();
    },
  });

  const writeError = applyCorrection.error ?? undoCorrection.error;
  const error = writeError
    ? presentRequestError(writeError, "Could not change the attendance record.")
    : employeesQuery.isError
      ? presentRequestError(employeesQuery.error, "Could not load this branch's employees.")
      : correctionsQuery.isError
        ? presentRequestError(correctionsQuery.error, "Could not load corrections.")
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
        <EmptyPanel
          icon={<ScrollText className="size-5" aria-hidden="true" />}
          title="Choose an employee"
          hint="A correction changes one person's attendance day. Pick someone to see what has already been changed and to correct another day."
        />
      ) : (
        <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <section className="overflow-hidden rounded-[18px] bg-card shadow-[var(--shadow-card)] ring-1 ring-border">
            <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
              <h2 className="text-strong font-heading text-base font-bold">Correction log</h2>
              <span className="font-heading text-xs font-semibold text-muted-foreground tabular-nums">
                {corrections.length}
              </span>
            </header>

            {correctionsQuery.isPending ? (
              <div className="grid gap-3 p-5" aria-hidden="true">
                {[0, 1, 2].map((row) => (
                  <div key={row} className="flex gap-3">
                    <Skeleton className="size-9 shrink-0 rounded-[9px]" />
                    <div className="flex flex-1 flex-col gap-2">
                      <Skeleton className="h-3.5 w-1/3" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : corrections.length === 0 ? (
              <EmptyPanel
                bare
                icon={<ClipboardCheck className="size-5" aria-hidden="true" />}
                title="Nothing corrected yet"
                hint={`${employeeName}'s attendance is exactly what the devices recorded. Correct a day when a punch is missing or wrong.`}
              />
            ) : (
              <div className="divide-y divide-border">
                {corrections.map((correction) => (
                  <CorrectionEntry
                    key={correction.id}
                    correction={correction}
                    timeZone={timeZone}
                    manageable={manageable}
                    busy={undoCorrection.isPending}
                    onUndo={() => setUndoing({ id: correction.id, type: correction.type })}
                  />
                ))}
              </div>
            )}
          </section>

          {manageable ? (
            <section className="rounded-[18px] bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-border lg:sticky lg:top-[86px]">
              <h2 className="text-strong font-heading text-base font-bold">Correct a day</h2>
              <p className="mt-1 mb-4 text-xs text-muted-foreground">
                For {employeeName || "this employee"}
              </p>
              <CorrectionForm
                employeeName={employeeName}
                timeZone={timeZone}
                busy={applyCorrection.isPending}
                onSubmit={(values) => {
                  setNotice(null);
                  applyCorrection.mutate({
                    employeeId,
                    type: values.type as CorrectionType,
                    attendanceDate: values.attendanceDate,
                    proposedTime: values.proposedTime,
                    reason: values.reason,
                  });
                }}
              />
            </section>
          ) : null}
        </div>
      )}

      {undoing ? (
        <ConfirmDialog
          title={`Undo this ${CORRECTION_TYPE_META[undoing.type].label.toLowerCase()}?`}
          description="The day is recalculated back to exactly what the devices recorded."
          confirmLabel="Undo correction"
          onCancel={() => setUndoing(null)}
          onConfirm={() => {
            setNotice(null);
            undoCorrection.mutate(undoing.id);
            setUndoing(null);
          }}
        />
      ) : null}
    </div>
  );
}

function EmptyPanel({
  icon,
  title,
  hint,
  bare = false,
}: {
  icon: React.ReactNode;
  title: string;
  hint: string;
  bare?: boolean;
}) {
  return (
    <div
      className={`grid place-items-center px-6 py-14 text-center ${
        bare ? "" : "rounded-[18px] bg-card shadow-[var(--shadow-card)] ring-1 ring-border"
      }`}
    >
      <span className="grid size-11 place-items-center rounded-[11px] bg-[var(--surface-subtle)] text-muted-foreground">
        {icon}
      </span>
      <p className="text-strong mt-4 text-sm font-bold">{title}</p>
      <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-muted-foreground">{hint}</p>
    </div>
  );
}
