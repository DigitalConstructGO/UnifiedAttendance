"use client";

import { useEffect, useState } from "react";

import { attendanceApi, organizationApi, type Branch, type DailyRegister } from "@/lib/api";
import { useAccess } from "@/components/access-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

function today() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Addis_Ababa" }).format(new Date());
}

function errorMessage(cause: unknown) {
  return cause instanceof Error ? cause.message : "Could not complete the attendance action.";
}

const outcomeClass = {
  present: "text-emerald-700",
  partial: "text-amber-700",
  absent: "text-destructive",
  unknown: "text-muted-foreground",
} as const;

export function AttendanceWorkspace() {
  const { can } = useAccess();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [branchId, setBranchId] = useState("");
  const [date, setDate] = useState(today);
  const [register, setRegister] = useState<DailyRegister | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function loadRegister(nextBranchId = branchId, nextDate = date) {
    const nextBranches = branches.length ? branches : await organizationApi.branches();
    if (!branches.length) setBranches(nextBranches);
    const resolvedBranch = nextBranchId || nextBranches[0]?.id || "";
    setBranchId(resolvedBranch);
    if (!resolvedBranch) return;
    setRegister(await attendanceApi.register({ branchId: resolvedBranch, date: nextDate }));
  }

  useEffect(() => {
    void loadRegister().catch((cause) => setError(errorMessage(cause)));
  }, []);

  const selected = register?.rows.find((row) => row.employee.id === selectedId) ?? null;
  const counts =
    register?.rows.reduce<Record<string, number>>((total, row) => {
      total[row.day.outcome] = (total[row.day.outcome] ?? 0) + 1;
      return total;
    }, {}) ?? {};

  async function submitManualEntry(form: HTMLFormElement) {
    if (!selected) return;
    const data = new FormData(form);
    setBusy(true);
    setError(null);
    try {
      const kind = String(data.get("kind")) as
        "check_in" | "check_out" | "mark_present" | "mark_absent";
      const time = String(data.get("time"));
      await attendanceApi.createManualEntry({
        employeeId: selected.employee.id,
        attendanceDate: date,
        kind,
        occurredAt: time ? new Date(`${date}T${time}:00`).toISOString() : undefined,
        reason: String(data.get("reason")),
      });
      setNotice("Manual attendance entry recorded and the day was recalculated.");
      await loadRegister();
    } catch (cause) {
      setError(errorMessage(cause));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Daily operations</p>
          <h1 className="mt-1 font-heading text-2xl font-bold tracking-tight">
            Attendance register
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Every employee assigned to this branch on the selected date.
          </p>
        </div>
        <div className="flex gap-2">
          <label className="grid gap-1 text-xs font-medium">
            Branch
            <select
              className="h-8 rounded-none border bg-background px-2 text-sm"
              value={branchId}
              onChange={(event) =>
                void loadRegister(event.target.value).catch((cause) =>
                  setError(errorMessage(cause)),
                )
              }
            >
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-medium">
            Date
            <Input
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value);
                void loadRegister(branchId, event.target.value).catch((cause) =>
                  setError(errorMessage(cause)),
                );
              }}
            />
          </label>
        </div>
      </header>

      {notice ? (
        <p role="status" className="text-sm text-emerald-700">
          {notice}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(["present", "partial", "absent", "unknown"] as const).map((outcome) => (
          <Card key={outcome} size="sm">
            <CardContent className="pt-3">
              <p className="text-xs text-muted-foreground capitalize">{outcome}</p>
              <p className={`font-heading text-2xl font-bold ${outcomeClass[outcome]}`}>
                {counts[outcome] ?? 0}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <CardTitle>Register</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs text-muted-foreground">
                  <tr>
                    <th className="pb-2">Employee</th>
                    <th className="pb-2">Assignment</th>
                    <th className="pb-2">Outcome</th>
                    <th className="pb-2">First in / last out</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {register?.rows.map((row) => (
                    <tr key={row.employee.id} className="border-t">
                      <td className="py-2 font-medium">
                        {row.person.firstName} {row.person.lastName}
                        <span className="block text-xs text-muted-foreground">
                          {row.employee.employeeCode}
                        </span>
                      </td>
                      <td className="py-2 capitalize">
                        {row.period.employmentType.replace("_", " ")}
                      </td>
                      <td
                        className={`py-2 font-medium capitalize ${outcomeClass[row.day.outcome]}`}
                      >
                        {row.day.outcome}
                      </td>
                      <td className="py-2 text-xs">
                        {row.day.firstIn
                          ? new Date(row.day.firstIn).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}{" "}
                        /{" "}
                        {row.day.lastOut
                          ? new Date(row.day.lastOut).toLocaleTimeString([], {
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : "—"}
                      </td>
                      <td className="py-2 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSelectedId(row.employee.id)}
                        >
                          Inspect
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {register?.rows.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No active employees are assigned to this branch today.
              </p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              {selected
                ? `${selected.person.firstName} ${selected.person.lastName}`
                : "Day details"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {selected ? (
              <>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Day type</dt>
                    <dd className="capitalize">{selected.day.dayType.replace("_", " ")}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Worked</dt>
                    <dd>{selected.day.workedMinutes ?? 0} minutes</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Late</dt>
                    <dd>{selected.day.lateMinutes ?? 0} minutes</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Exceptions</dt>
                    <dd>
                      {selected.day.missingCheckIn || selected.day.missingCheckOut
                        ? "Missing punch"
                        : "None"}
                    </dd>
                  </div>
                </dl>
                {can("attendance:manage") ? (
                  <form
                    className="grid gap-2 border-t pt-4"
                    onSubmit={(event) => {
                      event.preventDefault();
                      void submitManualEntry(event.currentTarget);
                    }}
                  >
                    <p className="text-sm font-medium">Record manual attendance</p>
                    <select
                      name="kind"
                      className="h-8 rounded-none border bg-background px-2 text-sm"
                    >
                      <option value="check_in">Check in</option>
                      <option value="check_out">Check out</option>
                      <option value="mark_present">Mark present</option>
                      <option value="mark_absent">Mark absent</option>
                    </select>
                    <Input name="time" type="time" aria-label="Manual attendance time" />
                    <Input required name="reason" placeholder="Reason" />
                    <Button disabled={busy}>Record and recalculate</Button>
                  </form>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    You have read-only access to attendance records.
                  </p>
                )}
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                Select a register row to inspect its derived day and available actions.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
