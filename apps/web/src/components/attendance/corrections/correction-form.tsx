"use client";

import { type ReactNode, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { localDateTimeToIso, today } from "../register-presentation";
import { DateField, TimeField } from "./date-time-picker";
import {
  CORRECTION_TYPE_META,
  CORRECTION_TYPES,
  type CorrectionType,
  DEFAULT_PROPOSED_TIME,
  needsProposedTime,
} from "./correction-presentation";

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <span className="text-strong text-xs font-bold">{label}</span>
      {children}
    </div>
  );
}

/**
 * Inline rather than a dialog. Correcting a day is the point of this section,
 * not an interruption to it, and the operator reads the log beside the form
 * while writing the reason.
 */
export function CorrectionForm({
  employeeName,
  timeZone,
  busy,
  onSubmit,
}: {
  employeeName: string;
  timeZone: string;
  busy: boolean;
  onSubmit: (values: {
    type: CorrectionType;
    attendanceDate: string;
    proposedTime: string | null;
    reason: string;
  }) => void;
}) {
  const [type, setType] = useState<CorrectionType>("add_check_in");
  const [attendanceDate, setAttendanceDate] = useState(() => today(timeZone));
  const [time, setTime] = useState(DEFAULT_PROPOSED_TIME);
  const [reason, setReason] = useState("");
  const meta = CORRECTION_TYPE_META[type];
  const timeRequired = needsProposedTime(type);
  const complete = attendanceDate.length > 0 && reason.trim().length > 0;

  return (
    <form
      className="grid gap-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit({
          type,
          attendanceDate,
          proposedTime: timeRequired ? localDateTimeToIso(attendanceDate, time, timeZone) : null,
          reason: reason.trim(),
        });
        setReason("");
      }}
    >
      <Field label="What needs correcting">
        <Select
          value={type}
          onValueChange={(next) => setType(next as CorrectionType)}
          items={CORRECTION_TYPES.map((option) => ({
            label: CORRECTION_TYPE_META[option].label,
            value: option,
          }))}
        >
          <SelectTrigger aria-label="Correction type">
            <SelectValue className="text-strong font-semibold" />
          </SelectTrigger>
          <SelectContent>
            {CORRECTION_TYPES.map((option) => (
              <SelectItem key={option} value={option}>
                {CORRECTION_TYPE_META[option].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {/* The chosen type explains itself; seven similar labels otherwise force
          the operator to guess which one matches the situation in front of them. */}
      <p className="flex items-start gap-2 text-xs leading-relaxed text-muted-foreground">
        <meta.icon className="mt-0.5 size-3.5 shrink-0 text-workflow" aria-hidden="true" />
        {meta.hint}
      </p>

      <Field label="Attendance date">
        <DateField
          value={attendanceDate}
          onChange={setAttendanceDate}
          ariaLabel="Attendance date"
        />
      </Field>

      {timeRequired ? (
        <Field label="Time it should have been">
          <TimeField value={time} onChange={setTime} />
        </Field>
      ) : null}

      <Field label="Reason">
        <textarea
          required
          rows={3}
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder={`Why ${employeeName || "this employee"}'s record is being changed`}
          className="w-full resize-y rounded-[11px] border border-input bg-background px-3 py-2.5 text-xs outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50"
        />
      </Field>

      <div className="flex items-center justify-between gap-3 border-t border-border pt-4">
        <p className="text-xs text-muted-foreground">
          Applies at once. Device records are never overwritten.
        </p>
        <Button
          disabled={busy || !complete}
          className="h-10 shrink-0 rounded-[11px] px-5 font-bold"
        >
          {busy ? "Applying…" : "Apply correction"}
        </Button>
      </div>
    </form>
  );
}
