import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { MANUAL_ENTRY_OPTIONS, type ManualKind, needsTime } from "./register-model";

export function ManualEntryForm({
  busy,
  manualKind,
  onKindChange,
  onSubmit,
}: {
  busy: boolean;
  manualKind: ManualKind;
  onKindChange: (kind: ManualKind) => void;
  onSubmit: (form: HTMLFormElement) => void;
}) {
  const timeRequired = needsTime(manualKind);

  return (
    <form
      className="grid gap-3 rounded-[12px] bg-[var(--surface-subtle)] p-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(event.currentTarget);
      }}
    >
      <div className="sm:col-span-2">
        <p className="text-strong text-sm font-bold">Record manual attendance</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Manual entries remain auditable and recalculate this day.
        </p>
      </div>
      <label className="text-strong grid gap-2 text-xs font-bold">
        Action
        <select
          name="kind"
          value={manualKind}
          onChange={(event) => onKindChange(event.target.value as ManualKind)}
          className="h-10 rounded-[11px] border border-input bg-background px-3 text-xs font-normal"
        >
          {MANUAL_ENTRY_OPTIONS.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="text-strong grid gap-2 text-xs font-bold">
        Time
        <Input
          name="time"
          type="time"
          required={timeRequired}
          disabled={!timeRequired}
          className="h-10 rounded-[11px] bg-background px-3 font-normal"
        />
      </label>
      <label className="text-strong grid gap-2 text-xs font-bold sm:col-span-2">
        Reason
        <Input
          required
          name="reason"
          placeholder="Why is this manual entry needed?"
          className="h-10 rounded-[11px] bg-background px-3 font-normal"
        />
      </label>
      <Button
        disabled={busy}
        className="h-10 rounded-[11px] font-bold shadow-[var(--shadow-action)] sm:col-span-2"
      >
        {busy ? "Recording entry…" : "Record and recalculate"}
      </Button>
    </form>
  );
}
