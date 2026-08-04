import { ArrowDownLeft, ArrowUpRight, HelpCircle, Waves } from "lucide-react";
import Link from "next/link";

import { Skeleton } from "@/components/ui/skeleton";
import type { OperationsOverview } from "@/lib/api";
import { relativeTime } from "@/lib/format-date";
import { avatarTone } from "@/components/attendance/register-presentation";

const DIRECTION = {
  in: { label: "In", icon: ArrowDownLeft, className: "bg-success/10 text-success" },
  out: { label: "Out", icon: ArrowUpRight, className: "bg-info/10 text-info" },
  unknown: { label: "Unknown", icon: HelpCircle, className: "bg-warning/12 text-warning" },
} as const;

export function LiveFeed({
  feed,
  timeZone,
  loading,
}: {
  feed: OperationsOverview["feed"];
  timeZone: string;
  loading: boolean;
}) {
  return (
    <section className="overflow-hidden rounded-[18px] bg-card shadow-[var(--shadow-card)] ring-1 ring-border/80">
      <header className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
        <h2 className="text-strong flex items-center gap-2 font-heading text-base font-bold">
          Live punches
          <span className="flex items-center gap-1.5 rounded-[7px] bg-success/10 px-2 py-0.5 text-[0.6875rem] font-bold text-success">
            <span className="size-1.5 animate-pulse rounded-full bg-success" aria-hidden="true" />
            Live
          </span>
        </h2>
        <Link
          href="/dashboard/attendance"
          className="text-xs font-bold text-primary hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          Open register
        </Link>
      </header>

      {loading ? (
        <div className="grid gap-3 p-5" aria-hidden="true">
          {[0, 1, 2, 3].map((row) => (
            <div key={row} className="flex items-center gap-3">
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <Skeleton className="h-3.5 w-1/3" />
              <Skeleton className="ml-auto h-3 w-16" />
            </div>
          ))}
        </div>
      ) : feed.length === 0 ? (
        <div className="grid place-items-center gap-2 px-6 py-12 text-center">
          <Waves className="size-5 text-muted-foreground" aria-hidden="true" />
          <p className="text-strong text-sm font-bold">No punches recorded yet</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Once a device reports, the punches it sends appear here as they land.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {feed.map((punch) => {
            const name = punch.firstName
              ? `${punch.firstName} ${punch.lastName}`
              : `Badge ${punch.identityNumber}`;
            const direction = DIRECTION[punch.direction];
            const Icon = direction.icon;
            return (
              <li key={punch.id} className="flex items-center gap-3 px-5 py-3">
                <span
                  aria-hidden="true"
                  className={`grid size-9 shrink-0 place-items-center rounded-full font-heading text-xs font-bold ${
                    punch.firstName ? avatarTone(name) : "bg-muted text-muted-foreground"
                  }`}
                >
                  {punch.firstName
                    ? `${punch.firstName[0]}${punch.lastName?.[0] ?? ""}`
                    : punch.identityNumber.slice(0, 2)}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-strong truncate text-sm font-bold">{name}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {punch.branchName} · {punch.deviceName}
                    {punch.employeeCode ? ` · ${punch.employeeCode}` : " · not enrolled"}
                  </p>
                </div>

                <span
                  className={`inline-flex shrink-0 items-center gap-1 rounded-[7px] px-2 py-1 text-[0.6875rem] font-bold ${direction.className}`}
                >
                  <Icon className="size-3" aria-hidden="true" />
                  {direction.label}
                </span>
                <span className="w-20 shrink-0 text-right font-heading text-[0.6875rem] font-semibold text-muted-foreground tabular-nums">
                  {relativeTime(punch.occurredAt, timeZone)}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
