import { RefreshCw } from "lucide-react";

import { Input } from "@/components/ui/input";
import type { Branch } from "@/lib/api";

export const attendanceSelectClass =
  "h-10 rounded-[11px] border border-input bg-background px-3 text-xs font-normal outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50";

export function RegisterControls({
  branches,
  branchId,
  date,
  showDate,
  refreshing,
  onBranchChange,
  onDateChange,
  onRefresh,
}: {
  branches: Branch[];
  branchId: string;
  date: string;
  showDate: boolean;
  refreshing: boolean;
  onBranchChange: (branchId: string) => void;
  onDateChange: (date: string) => void;
  onRefresh: () => void;
}) {
  return (
    <section
      className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-end sm:gap-3"
      aria-label="Register controls"
    >
      <label className="text-strong grid gap-1.5 text-xs font-bold sm:min-w-48">
        Branch
        <select
          className={`${attendanceSelectClass} w-full`}
          value={branchId}
          onChange={(event) => onBranchChange(event.target.value)}
        >
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
      </label>
      {showDate ? (
        <label className="text-strong grid gap-1.5 text-xs font-bold">
          Date
          <Input
            type="date"
            value={date}
            className="h-10 w-full rounded-[11px] bg-background px-3 font-normal sm:w-44"
            onChange={(event) => onDateChange(event.target.value)}
          />
        </label>
      ) : null}
      <button
        type="button"
        onClick={onRefresh}
        disabled={refreshing}
        className="flex h-10 items-center justify-center gap-1.5 rounded-[11px] border border-input bg-background px-3 text-xs font-bold text-primary hover:bg-primary/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60 sm:justify-start"
      >
        <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
        {refreshing ? "Refreshing…" : "Refresh"}
      </button>
    </section>
  );
}
