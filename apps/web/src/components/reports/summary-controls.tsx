import { ChevronLeft, ChevronRight, Download, Search } from "lucide-react";

import { attendanceSelectClass } from "@/components/attendance/register-controls";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Branch, Department } from "@/lib/api";

import { formatRangeLabel, type ReportPreset, type ReportRange } from "./period";

const PRESETS: ReadonlyArray<{ id: ReportPreset; label: string; currentLabel: string }> = [
  { id: "day", label: "Day", currentLabel: "Today" },
  { id: "week", label: "Week", currentLabel: "This week" },
  { id: "month", label: "Month", currentLabel: "This month" },
];

export function SummaryControls({
  preset,
  range,
  today,
  canGoNext,
  branches,
  branchId,
  departments,
  departmentId,
  searchTerm,
  exporting,
  hasRows,
  onPresetChange,
  onMove,
  onCurrent,
  onJumpToDate,
  onBranchChange,
  onDepartmentChange,
  onSearchChange,
  onExport,
}: {
  preset: ReportPreset;
  range: ReportRange;
  today: string;
  canGoNext: boolean;
  branches: Branch[];
  branchId: string;
  departments: Department[];
  departmentId: string;
  searchTerm: string;
  exporting: boolean;
  hasRows: boolean;
  onPresetChange: (preset: ReportPreset) => void;
  onMove: (step: -1 | 1) => void;
  onCurrent: () => void;
  onJumpToDate: (date: string) => void;
  onBranchChange: (branchId: string) => void;
  onDepartmentChange: (departmentId: string) => void;
  onSearchChange: (value: string) => void;
  onExport: () => void;
}) {
  const currentLabel = PRESETS.find((item) => item.id === preset)?.currentLabel ?? "Current";

  return (
    <section className="flex flex-wrap items-center gap-3" aria-label="Report controls">
      <div
        className="flex gap-1 rounded-[11px] bg-[var(--surface-subtle)] p-1"
        role="group"
        aria-label="Period length"
      >
        {PRESETS.map((item) => (
          <Button
            key={item.id}
            size="sm"
            variant={preset === item.id ? "default" : "ghost"}
            className="h-8 rounded-[9px] px-3"
            aria-pressed={preset === item.id}
            onClick={() => onPresetChange(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        <Button
          size="sm"
          variant="outline"
          className="h-9 rounded-[9px] px-2"
          aria-label="Previous period"
          onClick={() => onMove(-1)}
        >
          <ChevronLeft className="size-4" aria-hidden="true" />
        </Button>
        <span className="min-w-40 text-center font-numeric text-xs font-bold">
          {formatRangeLabel(range, preset)}
        </span>
        <Button
          size="sm"
          variant="outline"
          className="h-9 rounded-[9px] px-2"
          aria-label="Next period"
          disabled={!canGoNext}
          onClick={() => onMove(1)}
        >
          <ChevronRight className="size-4" aria-hidden="true" />
        </Button>
        <Button size="sm" variant="ghost" className="h-9 rounded-[9px] px-3" onClick={onCurrent}>
          {currentLabel}
        </Button>
        <Input
          type="date"
          value={range.from}
          max={today}
          aria-label="Jump to a date"
          className="h-9 w-36 rounded-[9px] bg-background px-2 font-normal"
          onChange={(event) => onJumpToDate(event.target.value)}
        />
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-3">
        <select
          className={attendanceSelectClass}
          value={branchId}
          aria-label="Branch"
          onChange={(event) => onBranchChange(event.target.value)}
        >
          <option value="">All branches</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>
              {branch.name}
            </option>
          ))}
        </select>
        <select
          className={attendanceSelectClass}
          value={departmentId}
          aria-label="Department"
          onChange={(event) => onDepartmentChange(event.target.value)}
        >
          <option value="">All departments</option>
          {departments.map((department) => (
            <option key={department.id} value={department.id}>
              {department.name}
            </option>
          ))}
        </select>
        <label className="relative block w-52">
          <Search
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            type="search"
            value={searchTerm}
            placeholder="Search name or code…"
            aria-label="Search employees"
            className="h-9 rounded-[11px] bg-background pl-9 font-normal"
            onChange={(event) => onSearchChange(event.target.value)}
          />
        </label>
        <Button
          size="sm"
          variant="outline"
          className="h-9 rounded-[9px] px-3"
          disabled={exporting || !hasRows}
          onClick={onExport}
        >
          <Download className="size-4" aria-hidden="true" />
          {exporting ? "Exporting…" : "Export CSV"}
        </Button>
      </div>
    </section>
  );
}
