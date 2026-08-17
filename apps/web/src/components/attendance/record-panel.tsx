import { CalendarClock, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TablePagination } from "@/components/table-pagination";

import type { QuickKind, RegisterRow } from "./register-model";
import { attendanceSelectClass } from "./register-controls";
import {
  avatarTone,
  formatTime,
  isAttendanceDayLocked,
  registerStatus,
  timeInputValue,
  today,
} from "./register-presentation";

function dayLabel(date: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${date}T12:00:00Z`));
}

export function RecordPanel({
  rows,
  total,
  page,
  pageCount,
  pageSize,
  loading,
  refreshing,
  date,
  timeZone,
  isToday,
  isFuture,
  searchTerm,
  busyEmployeeId,
  onSearchChange,
  onRecord,
  onPageChange,
  onGoToToday,
}: {
  rows: RegisterRow[];
  total: number;
  page: number;
  pageCount: number;
  pageSize: number;
  loading: boolean;
  refreshing: boolean;
  date: string;
  timeZone: string;
  isToday: boolean;
  isFuture: boolean;
  searchTerm: string;
  busyEmployeeId: string | null;
  onSearchChange: (value: string) => void;
  onRecord: (row: RegisterRow, kind: QuickKind, time: string) => void;
  onPageChange: (page: number) => void;
  onGoToToday: (date: string) => void;
}) {
  const checkedIn = rows.filter((row) => row.day.firstIn).length;
  const done = rows.filter((row) => row.day.firstIn && row.day.lastOut).length;
  const locked = !isFuture && isAttendanceDayLocked(date, timeZone);

  return (
    <Card className="gap-0 rounded-[18px] py-0 shadow-[var(--shadow-card)] ring-border">
      <CardHeader className="border-b border-border px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-strong text-sm font-bold">
              {isToday
                ? "Who is in today"
                : isFuture
                  ? "Nothing to record yet"
                  : `Recording for ${dayLabel(date)}`}
            </CardTitle>
            {!isFuture ? (
              <p className="mt-1 text-xs text-muted-foreground">
                {checkedIn} of {rows.length} checked in{pageCount > 1 ? " on this page" : ""} ·{" "}
                {done} finished for the day
              </p>
            ) : null}
          </div>
          <label className="relative block sm:w-64">
            <Search
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              type="search"
              value={searchTerm}
              placeholder="Search name or code…"
              aria-label="Search employees"
              className="h-10 rounded-[11px] bg-background pl-9 font-normal"
              onChange={(event) => onSearchChange(event.target.value)}
            />
          </label>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        {isFuture ? (
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 text-sm text-amber-700 dark:text-warning">
            <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
            <p className="min-w-0 flex-1">
              This day has not happened yet. Pick today or an earlier day to record attendance.
            </p>
            <Button
              size="sm"
              variant="outline"
              className="h-8 rounded-[9px] px-3"
              onClick={() => onGoToToday(today(timeZone))}
            >
              Go to today
            </Button>
          </div>
        ) : null}

        {!isFuture ? (
          <ul
            className={`divide-y divide-border ${refreshing && !busyEmployeeId ? "opacity-50" : ""} transition-opacity`}
            aria-busy={refreshing && !busyEmployeeId}
          >
            {rows.map((row) => (
              <RecordRow
                key={row.employee.id}
                row={row}
                timeZone={timeZone}
                busyEmployeeId={busyEmployeeId}
                locked={locked}
                onRecord={onRecord}
              />
            ))}
          </ul>
        ) : null}

        {!isFuture && loading ? (
          <div className="grid min-h-48 place-items-center" role="status">
            <p className="text-xs text-muted-foreground">Loading the roster…</p>
          </div>
        ) : null}
        {!isFuture && !loading && rows.length === 0 ? (
          <div className="grid min-h-48 place-items-center px-5 text-center">
            <div>
              <p className="text-strong text-sm font-bold">
                {searchTerm ? "Nobody matches that search" : "Nobody to record"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {searchTerm
                  ? "Check the spelling, or clear the search to see the whole roster."
                  : "No active employees are assigned to this branch today."}
              </p>
            </div>
          </div>
        ) : null}

        {!isFuture && !loading && rows.length > 0 ? (
          <TablePagination
            noun="employees"
            shown={rows.length}
            total={total}
            page={page}
            pageCount={pageCount}
            pageSize={pageSize}
            onPageChange={onPageChange}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function RecordRow({
  row,
  timeZone,
  busyEmployeeId,
  locked,
  onRecord,
}: {
  row: RegisterRow;
  timeZone: string;
  busyEmployeeId: string | null;
  locked: boolean;
  onRecord: (row: RegisterRow, kind: QuickKind, time: string) => void;
}) {
  const fullName = `${row.person.firstName} ${row.person.lastName}`;
  const recording = busyEmployeeId === row.employee.id;
  const offDay = registerStatus(row) === "off_day";

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-3 hover:bg-muted/40">
      <span
        className={`grid size-9 shrink-0 place-items-center rounded-[9px] text-xs font-bold ${avatarTone(fullName)}`}
        aria-hidden="true"
      >
        {row.person.firstName[0]}
        {row.person.lastName[0]}
      </span>
      <span className="min-w-0 flex-1 basis-40">
        <span className="text-strong block truncate text-xs font-bold">{fullName}</span>
        <span className="block truncate text-[0.6875rem] text-muted-foreground">
          {row.employee.employeeCode}
          {offDay ? " · off day" : ""}
        </span>
      </span>
      <RecordState row={row} timeZone={timeZone} />
      <RecordEntryForm
        key={`${row.day.firstIn ?? ""}|${row.day.lastOut ?? ""}`}
        row={row}
        recording={recording}
        timeZone={timeZone}
        locked={locked}
        onRecord={onRecord}
      />
    </li>
  );
}

function RecordState({ row, timeZone }: { row: RegisterRow; timeZone: string }) {
  const { firstIn, lastOut } = row.day;
  if (firstIn && lastOut)
    return (
      <span className="font-numeric text-xs font-bold text-muted-foreground">
        {formatTime(firstIn, timeZone)} → {formatTime(lastOut, timeZone)}
      </span>
    );
  if (firstIn)
    return (
      <span className="font-numeric text-xs font-bold text-info">
        In {formatTime(firstIn, timeZone)}
      </span>
    );
  return <span className="text-xs text-muted-foreground">Not in yet</span>;
}

function RecordEntryForm({
  row,
  recording,
  timeZone,
  locked,
  onRecord,
}: {
  row: RegisterRow;
  recording: boolean;
  timeZone: string;
  locked: boolean;
  onRecord: (row: RegisterRow, kind: QuickKind, time: string) => void;
}) {
  const fullName = `${row.person.firstName} ${row.person.lastName}`;
  const suggestedKind: QuickKind = row.day.firstIn ? "check_out" : "check_in";
  const now = timeInputValue(new Date().toISOString(), timeZone);

  const submitButton = (
    <Button
      size="sm"
      disabled={recording || locked}
      className="h-9 w-24 rounded-[9px] font-bold shadow-[var(--shadow-action)]"
    >
      {recording ? "Recording…" : "Record"}
    </Button>
  );

  return (
    <form
      className="flex shrink-0 items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const data = new FormData(event.currentTarget);
        onRecord(row, String(data.get("kind")) as QuickKind, String(data.get("time")));
      }}
    >
      <select
        name="kind"
        defaultValue={suggestedKind}
        disabled={locked}
        aria-label={`Action for ${fullName}`}
        className={`${attendanceSelectClass} h-9`}
      >
        <option value="check_in">Check in</option>
        <option value="check_out" disabled={!row.day.firstIn}>
          Check out
        </option>
      </select>
      <Input
        name="time"
        type="time"
        required
        disabled={locked}
        defaultValue={now}
        aria-label={`Time for ${fullName}`}
        className="h-9 w-26 rounded-[9px] bg-background px-2 font-numeric font-normal"
      />
      {locked ? (
        <Tooltip>
          <TooltipTrigger asChild>
            <span tabIndex={0}>{submitButton}</span>
          </TooltipTrigger>
          <TooltipContent>
            Attendance older than 24 hours can&apos;t be recorded here use Corrections instead.
          </TooltipContent>
        </Tooltip>
      ) : (
        submitButton
      )}
    </form>
  );
}
