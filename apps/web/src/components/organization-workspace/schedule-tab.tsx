import { Save } from "lucide-react";
import type { Dispatch, SetStateAction } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Branch, WorkingDay } from "@/lib/api/organization";
import { WEEK } from "./types";

type Props = {
  branches: Branch[];
  selectedBranch: string;
  days: WorkingDay[];
  busy: boolean;
  onBranchChange: (branchId: string) => void;
  onDaysChange: Dispatch<SetStateAction<WorkingDay[]>>;
  onSave: () => void;
};

export function ScheduleTab({
  branches,
  selectedBranch,
  days,
  busy,
  onBranchChange,
  onDaysChange,
  onSave,
}: Props) {
  function updateDay(id: string, changes: Partial<WorkingDay>) {
    onDaysChange((current) => current.map((day) => (day.id === id ? { ...day, ...changes } : day)));
  }

  return (
    <section className="rounded-[18px] bg-card p-6 shadow-[var(--shadow-card)] ring-1 ring-border">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-strong font-heading font-bold">Working week</h2>
          <p className="text-xs text-muted-foreground">
            Choose a branch and maintain its schedule.
          </p>
        </div>
        <select
          value={selectedBranch}
          onChange={(event) => onBranchChange(event.target.value)}
          className="h-10 rounded-[11px] border border-input bg-background px-3 text-xs font-semibold"
        >
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-2">
        {[...days]
          .sort((a, b) => a.weekday - b.weekday)
          .map((day) => (
            <div
              key={day.id}
              className="grid items-center gap-3 rounded-[11px] bg-[var(--surface-subtle)] p-3 sm:grid-cols-[1fr_auto_8rem_8rem]"
            >
              <label className="text-strong flex items-center gap-3 text-xs font-semibold">
                <input
                  type="checkbox"
                  checked={day.isWorkingDay}
                  onChange={(event) => updateDay(day.id, { isWorkingDay: event.target.checked })}
                  className="size-4 accent-primary"
                />
                {WEEK[day.weekday]}
              </label>
              <span className="text-[0.6875rem] text-muted-foreground">
                {day.isWorkingDay ? "Working day" : "Closed"}
              </span>
              <Input
                aria-label={`${WEEK[day.weekday]} opening time`}
                type="time"
                disabled={!day.isWorkingDay}
                value={day.openingTime || ""}
                onChange={(event) => updateDay(day.id, { openingTime: event.target.value })}
              />
              <Input
                aria-label={`${WEEK[day.weekday]} closing time`}
                type="time"
                disabled={!day.isWorkingDay}
                value={day.closingTime || ""}
                onChange={(event) => updateDay(day.id, { closingTime: event.target.value })}
              />
            </div>
          ))}
      </div>
      <Button className="mt-5 h-10 rounded-[11px] font-bold" onClick={onSave} disabled={busy}>
        <Save className="size-4" />
        Save schedule
      </Button>
    </section>
  );
}
