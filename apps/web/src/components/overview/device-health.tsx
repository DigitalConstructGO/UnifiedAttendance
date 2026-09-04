import { Radio, RefreshCw } from "lucide-react";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import type { OperationsOverview } from "@/lib/api";
import { relativeTime } from "@/lib/format-date";

const HEALTH = {
  online: { label: "Online", dot: "bg-success", text: "text-success" },
  warning: { label: "Quiet", dot: "bg-warning", text: "text-warning" },
  offline: { label: "Offline", dot: "bg-destructive", text: "text-destructive" },
} as const;

export function DeviceHealth({
  devices,
  unmatchedPunches,
  loading,
  refreshing,
  onRefresh,
}: {
  devices: OperationsOverview["devices"];
  unmatchedPunches: number;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
}) {
  const needsAttention = devices.rows.filter((device) => device.health !== "online");

  return (
    <section className="rounded-[18px] bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-border/80">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-strong font-heading text-base font-bold">Device health</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-[7px] px-2 py-1 text-xs font-bold text-primary hover:bg-primary/8 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-60"
          >
            <RefreshCw
              className={`size-3.5 ${refreshing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <Link
            href="/dashboard/devices"
            className="text-xs font-bold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            View all
          </Link>
        </div>
      </div>

      {loading ? (
        <Skeleton className="mt-5 h-24 w-full rounded-[11px]" />
      ) : devices.total === 0 ? (
        <div className="mt-5 grid place-items-center gap-2 rounded-[11px] bg-[var(--surface-subtle)] px-4 py-8 text-center">
          <Radio className="size-5 text-muted-foreground" aria-hidden="true" />
          <p className="text-strong text-sm font-bold">No devices registered</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Attendance arrives from biometric readers. Register one to start collecting punches.
          </p>
        </div>
      ) : (
        <>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <Count value={devices.online} meta={HEALTH.online} />
            <Count value={devices.warning} meta={HEALTH.warning} />
            <Count value={devices.offline} meta={HEALTH.offline} />
          </div>

          {needsAttention.length > 0 ? (
            <ul className="mt-3 grid gap-1.5">
              {needsAttention.slice(0, 4).map((device) => (
                <li
                  key={device.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-[9px] bg-[var(--surface-subtle)] px-3 py-2 text-xs"
                >
                  <span className="text-strong font-semibold">
                    {device.name}
                    <span className="ml-1.5 font-normal text-muted-foreground">
                      {device.branchName}
                    </span>
                  </span>
                  <span className={`font-semibold ${HEALTH[device.health].text}`}>
                    {device.lastSeenAt
                      ? `Last seen ${relativeTime(device.lastSeenAt)}`
                      : "Never reported"}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}

          <p className="mt-3 border-t border-border pt-3 text-xs text-muted-foreground">
            {unmatchedPunches > 0 ? (
              <>
                <span className="text-strong font-heading font-semibold tabular-nums">
                  {unmatchedPunches}
                </span>{" "}
                punches this week came from badges nobody is enrolled to.
              </>
            ) : (
              "Every punch this week matched an enrolled employee."
            )}
          </p>
        </>
      )}
    </section>
  );
}

function Count({ value, meta }: { value: number; meta: (typeof HEALTH)[keyof typeof HEALTH] }) {
  return (
    <div className="rounded-[11px] bg-[var(--surface-subtle)] px-3 py-3">
      <p className="text-strong font-numeric text-2xl font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 flex items-center gap-1.5 text-[0.6875rem] font-semibold text-muted-foreground">
        <span className={`size-1.5 rounded-full ${meta.dot}`} aria-hidden="true" />
        {meta.label}
      </p>
    </div>
  );
}
