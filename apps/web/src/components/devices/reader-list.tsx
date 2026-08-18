"use client";

import { Pencil, RefreshCw, Router } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Device } from "@/lib/api";
import { relativeTime } from "@/lib/format-date";

import { DEVICE_HEALTH_META, deviceHealth } from "./device-presentation";


const ORDER = { offline: 0, warning: 1, online: 2 } as const;

export function ReaderList({
  devices,
  manageable,
  loading,
  refreshing,
  onRefresh,
  editingId,
  onEdit,
}: {
  devices: Device[];
  manageable: boolean;
  loading: boolean;
  refreshing: boolean;
  onRefresh: () => void;
  editingId: string | null;
  onEdit: (device: Device) => void;
}) {
  const rows = [...devices]
    .map((device) => ({ device, health: deviceHealth(device) }))
    .sort(
      (a, b) => ORDER[a.health] - ORDER[b.health] || a.device.name.localeCompare(b.device.name),
    );

  return (
    <section className="overflow-hidden rounded-[18px] bg-card shadow-[var(--shadow-card)] ring-1 ring-border">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="text-strong font-heading text-base font-bold">Readers</h2>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="flex items-center gap-1.5 rounded-[7px] px-2 py-1 text-xs font-bold text-primary hover:bg-primary/8 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <RefreshCw
              className={`size-3.5 ${refreshing ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            {refreshing ? "Refreshing…" : "Refresh"}
          </button>
          <span className="font-heading text-xs font-semibold text-muted-foreground tabular-nums">
            {devices.length}
          </span>
        </div>
      </header>

      {loading ? (
        <div className="grid gap-3 p-5" aria-hidden="true">
          {[0, 1, 2].map((row) => (
            <div key={row} className="flex items-center gap-3">
              <Skeleton className="size-9 shrink-0 rounded-[9px]" />
              <div className="flex flex-1 flex-col gap-2">
                <Skeleton className="h-3.5 w-1/3" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="grid place-items-center gap-2 px-6 py-14 text-center">
          <span className="grid size-11 place-items-center rounded-[11px] bg-[var(--surface-subtle)] text-muted-foreground">
            <Router className="size-5" aria-hidden="true" />
          </span>
          <p className="text-strong mt-2 text-sm font-bold">No readers at this branch</p>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            Attendance only exists because a reader sends it. Register the device installed here to
            start collecting punches.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map(({ device, health }) => {
            const meta = DEVICE_HEALTH_META[health];
            const Icon = meta.icon;
            return (
              <li
                key={device.id}
                className={`flex flex-wrap items-center gap-3 px-5 py-4 ${
                  editingId === device.id ? "bg-[var(--surface-subtle)]" : ""
                }`}
              >
                <span
                  aria-hidden="true"
                  className={`grid size-9 shrink-0 place-items-center rounded-[9px] ${meta.badgeClass}`}
                >
                  <Icon className="size-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <h3 className="text-strong text-sm font-bold">{device.name}</h3>
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-[7px] px-2 py-0.5 text-[0.6875rem] font-bold ${meta.badgeClass}`}
                    >
                      <span
                        className={`size-1.5 rounded-full ${meta.dotClass}`}
                        aria-hidden="true"
                      />
                      {meta.label}
                    </span>
                    {device.status === "inactive" ? (
                      <span className="text-[0.6875rem] font-semibold text-muted-foreground">
                        Retired
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    <span className="font-heading font-semibold tabular-nums">
                      {device.serialNumber}
                    </span>
                    {device.model ? ` · ${device.model}` : ""}
                    {device.firmwareVersion ? ` · firmware ${device.firmwareVersion}` : ""}
                  </p>
                  <p className="mt-0.5 text-xs text-muted-foreground">
                    {device.lastSeenAt
                      ? `Last reported ${relativeTime(device.lastSeenAt)}`
                      : "Has never reported"}
                  </p>
                </div>

                {manageable ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onEdit(device)}
                    className="h-9 shrink-0 rounded-[9px] px-3 text-xs font-bold"
                  >
                    <Pencil aria-hidden="true" />
                    Edit
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
