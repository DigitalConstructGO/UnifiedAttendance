import { Card, CardContent } from "@/components/ui/card";

import { type RegisterStatus, SUMMARY_STATUSES } from "./register-model";
import { STATUS_META } from "./register-presentation";

export function SummaryCards({
  counts,
  loading,
}: {
  counts: Record<RegisterStatus, number>;
  loading: boolean;
}) {
  return (
    <section
      className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"
      aria-label="Attendance summary"
    >
      {SUMMARY_STATUSES.map((status) => {
        const meta = STATUS_META[status];
        return (
          <Card
            key={status}
            className="min-h-[88px] justify-center gap-0 rounded-[18px] py-0 shadow-[var(--shadow-card)] ring-border"
          >
            <CardContent className="px-5 py-4">
              <p className="text-xs font-semibold text-muted-foreground">{meta.label}</p>
              <p className={`mt-1 font-numeric text-2xl font-bold ${meta.countClass}`}>
                {loading ? "—" : counts[status]}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </section>
  );
}
