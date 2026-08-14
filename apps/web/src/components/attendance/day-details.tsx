import { X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ManualEntryForm } from "./manual-entry-form";
import type { ManualKind, RegisterRow } from "./register-model";
import { registerStatus } from "./register-presentation";

function DayStat({
  label,
  value,
  valueClass = "",
}: {
  label: string;
  value: string;
  valueClass?: string;
}) {
  return (
    <div className="rounded-[11px] bg-[var(--surface-subtle)] p-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`text-strong mt-1 font-bold ${valueClass}`}>{value}</dd>
    </div>
  );
}

export function DayDetails({
  row,
  canManage,
  busy,
  manualKind,
  onKindChange,
  onClose,
  onSubmit,
}: {
  row: RegisterRow;
  canManage: boolean;
  busy: boolean;
  manualKind: ManualKind;
  onKindChange: (kind: ManualKind) => void;
  onClose: () => void;
  onSubmit: (form: HTMLFormElement) => void;
}) {
  const fullName = `${row.person.firstName} ${row.person.lastName}`;

  return (
    <Card className="gap-0 rounded-[18px] py-0 shadow-[var(--shadow-card)] ring-border">
      <CardHeader className="border-b border-border px-5 py-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <CardTitle className="text-strong font-bold">{fullName}</CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {row.employee.employeeCode} · Attendance day details
            </p>
          </div>
          <Button variant="ghost" size="icon-sm" onClick={onClose} aria-label="Close day details">
            <X aria-hidden="true" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="grid gap-6 p-5 lg:grid-cols-[0.8fr_1.2fr]">
        <dl className="grid grid-cols-2 gap-3 self-start text-xs">
          <DayStat
            label="Day type"
            value={row.day.dayType.replace("_", " ")}
            valueClass="capitalize"
          />
          <DayStat
            label="Worked"
            value={`${row.day.workedMinutes ?? 0} min`}
            valueClass="font-numeric"
          />
          <DayStat
            label="Late"
            value={`${row.day.lateMinutes ?? 0} min`}
            valueClass="font-numeric"
          />
          <DayStat
            label="Exception"
            value={registerStatus(row) === "missing_punch" ? "Missing punch" : "None"}
          />
        </dl>

        {canManage ? (
          <ManualEntryForm
            busy={busy}
            manualKind={manualKind}
            onKindChange={onKindChange}
            onSubmit={onSubmit}
          />
        ) : (
          <p className="text-xs text-muted-foreground">
            You have read-only access to attendance records.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
