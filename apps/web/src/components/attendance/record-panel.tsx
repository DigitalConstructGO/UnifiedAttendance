import { CalendarClock, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

import type { QuickKind, RegisterRow } from "./register-model";
import { attendanceSelectClass } from "./register-controls";
import { avatarTone, formatTime, registerStatus, today } from "./register-presentation";

export function RecordPanel({
  rows,
  page,
  pageCount,
  loading,
  timeZone,
  isToday,
  searchTerm,
  busyEmployeeId,
  onSearchChange,
  onRecord,
  onPageChange,
  onGoToToday,
}: {
  rows: RegisterRow[];
  page: number;
  pageCount: number;
  loading: boolean;
  timeZone: string;
  isToday: boolean;
  searchTerm: string;
  busyEmployeeId: string | null;
  onSearchChange: (value: string) => void;
  onRecord: (row: RegisterRow, kind: QuickKind, time: string) => void;
  onPageChange: (page: number) => void;
  onGoToToday: (date: string) => void;
}) {
  const checkedIn = rows.filter((row) => row.day.firstIn).length;
  const done = rows.filter((row) => row.day.firstIn && row.day.lastOut).length;

  return (
    <Card className="gap-0 rounded-[18px] py-0 shadow-[var(--shadow-card)] ring-border">
      <CardHeader className="border-b border-border px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-strong text-sm font-bold">
              {isToday ? "Who is in today" : "Recording needs today's register"}
            </CardTitle>
            {isToday ? (
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
        {!isToday ? (
          <div className="flex flex-wrap items-center gap-3 px-5 py-4 text-sm text-amber-700 dark:text-warning">
            <CalendarClock className="size-4 shrink-0" aria-hidden="true" />
            <p className="min-w-0 flex-1">
              Entries are stamped with the current time, so recording only works on today. The
              register keeps a day panel for backfilling other dates.
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

        {isToday ? (
          <ul className="divide-y divide-border">
            {rows.map((row) => (
              <RecordRow
                key={row.employee.id}
                row={row}
                timeZone={timeZone}
                busyEmployeeId={busyEmployeeId}
                onRecord={onRecord}
              />
            ))}
          </ul>
        ) : null}

        {isToday && loading ? (
          <div className="grid min-h-48 place-items-center" role="status">
            <p className="text-xs text-muted-foreground">Loading the roster…</p>
          </div>
        ) : null}
        {isToday && !loading && rows.length === 0 ? (
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

        {isToday && !loading && pageCount > 1 ? (
          <footer className="flex items-center justify-between gap-3 border-t border-border px-5 py-3 text-xs text-muted-foreground">
            <span className="font-numeric">
              Page {page + 1} of {pageCount}
            </span>
            <span className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-[9px] px-3"
                disabled={page === 0}
                onClick={() => onPageChange(page - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 rounded-[9px] px-3"
                disabled={page >= pageCount - 1}
                onClick={() => onPageChange(page + 1)}
              >
                Next
              </Button>
            </span>
          </footer>
        ) : null}
      </CardContent>
    </Card>
  );
}

function RecordRow({
  row,
  timeZone,
  busyEmployeeId,
  onRecord,
}: {
  row: RegisterRow;
  timeZone: string;
  busyEmployeeId: string | null;
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
        // Remount when the day's ends change, so the suggested action and the
        // pre-filled time follow what was just recorded.
        key={`${row.day.firstIn ?? ""}|${row.day.lastOut ?? ""}`}
        row={row}
        recording={recording}
        busy={busyEmployeeId !== null}
        timeZone={timeZone}
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

/**
 * One line of controls per person: what happened, when it happened, record.
 * The action and time arrive pre-filled with the likely answer — next step in
 * the day, current clock — so the common case is still two clicks, while a
 * late catch-up ("Abebe came at 8:30") is just an edited time away.
 */
function RecordEntryForm({
  row,
  recording,
  busy,
  timeZone,
  onRecord,
}: {
  row: RegisterRow;
  recording: boolean;
  busy: boolean;
  timeZone: string;
  onRecord: (row: RegisterRow, kind: QuickKind, time: string) => void;
}) {
  const fullName = `${row.person.firstName} ${row.person.lastName}`;
  const suggestedKind: QuickKind = row.day.firstIn ? "check_out" : "check_in";
  const now = formatTime(new Date().toISOString(), timeZone);

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
        aria-label={`Action for ${fullName}`}
        className={`${attendanceSelectClass} h-9`}
      >
        <option value="check_in">Check in</option>
        <option value="check_out">Check out</option>
      </select>
      <Input
        name="time"
        type="time"
        required
        defaultValue={now}
        aria-label={`Time for ${fullName}`}
        className="h-9 w-26 rounded-[9px] bg-background px-2 font-numeric font-normal"
      />
      <Button
        size="sm"
        disabled={busy}
        className="h-9 w-24 rounded-[9px] font-bold shadow-[var(--shadow-action)]"
      >
        {recording ? "Recording…" : "Record"}
      </Button>
    </form>
  );
}
