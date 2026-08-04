import { Skeleton } from "@/components/ui/skeleton";
import type { OperationsOverview } from "@/lib/api";

const WEEKDAY = new Intl.DateTimeFormat("en-GB", { weekday: "short", timeZone: "UTC" });

export function AttendanceTrend({
  trend,
  loading,
}: {
  trend: OperationsOverview["trend"];
  loading: boolean;
}) {
  const peak = Math.max(1, ...trend.map((day) => day.present + day.late + day.absent));

  return (
    <section className="rounded-[18px] bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-border/80">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="text-strong font-heading text-base font-bold">Attendance, last 7 days</h2>
        <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.6875rem] font-semibold text-muted-foreground">
          <Key className="bg-success" label="On time" />
          <Key className="bg-warning" label="Late" />
          <Key className="bg-destructive/70" label="Absent" />
        </ul>
      </div>

      {loading ? (
        <Skeleton className="mt-5 h-40 w-full rounded-[11px]" />
      ) : (
        <div className="mt-5 flex h-40 items-end gap-2">
          {trend.map((day) => {
            const total = day.present + day.late + day.absent;
            return (
              <div key={day.date} className="flex h-full flex-1 flex-col justify-end gap-1.5">
                <div
                  className="flex w-full flex-col justify-end overflow-hidden rounded-[6px]"
                  style={{ height: `${(total / peak) * 100}%` }}
                >
                  <Segment
                    count={day.absent}
                    total={total}
                    className="bg-destructive/70"
                    label="absent"
                    date={day.date}
                  />
                  <Segment
                    count={day.late}
                    total={total}
                    className="bg-warning"
                    label="late"
                    date={day.date}
                  />
                  <Segment
                    count={day.present}
                    total={total}
                    className="bg-success"
                    label="on time"
                    date={day.date}
                  />
                </div>
                <span className="text-center text-[0.6875rem] font-semibold text-muted-foreground">
                  {WEEKDAY.format(new Date(`${day.date}T12:00:00Z`))}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function Segment({
  count,
  total,
  className,
  label,
  date,
}: {
  count: number;
  total: number;
  className: string;
  label: string;
  date: string;
}) {
  if (count === 0) return null;
  return (
    <div
      className={className}
      style={{ height: `${(count / total) * 100}%` }}
      title={`${date}: ${count} ${label}`}
    />
  );
}

function Key({ className, label }: { className: string; label: string }) {
  return (
    <li className="flex items-center gap-1.5">
      <span className={`size-2 rounded-full ${className}`} aria-hidden="true" />
      {label}
    </li>
  );
}
