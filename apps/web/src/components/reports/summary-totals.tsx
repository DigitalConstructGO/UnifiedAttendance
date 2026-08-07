import { Card, CardContent } from "@/components/ui/card";

import type { AttendanceSummary } from "@/lib/api";

function hours(minutes: number) {
  return `${Math.round((minutes / 60) * 10) / 10}h`;
}

/**
 * The report's headline: rate first, then the four buckets a manager acts on.
 * Each card carries its own context line so the number can stand alone.
 */
export function SummaryTotals({
  totals,
  loading,
}: {
  totals: AttendanceSummary["totals"] | null;
  loading: boolean;
}) {
  const cards = [
    {
      label: "Attendance rate",
      value: totals ? `${totals.attendanceRatePercent}%` : "—",
      hint: totals ? `${totals.employees} employees · ${totals.expectedDays} expected days` : "",
      tone: "text-strong",
    },
    {
      label: "Present",
      value: totals ? totals.presentDays + totals.partialDays : "—",
      hint: totals ? `${hours(totals.workedMinutes)} worked · ${totals.partialDays} partial` : "",
      tone: "text-success",
    },
    {
      label: "Late",
      value: totals?.lateDays ?? "—",
      hint: totals ? `${totals.lateMinutes} minutes lost` : "",
      tone: "text-amber-700 dark:text-warning",
    },
    {
      label: "Absent",
      value: totals?.absentDays ?? "—",
      hint: totals ? `punctuality ${totals.punctualityRatePercent}%` : "",
      tone: "text-destructive",
    },
    {
      label: "Unrecorded",
      value: totals?.unrecordedDays ?? "—",
      hint: totals ? `${totals.missingPunchDays} days missing a punch` : "",
      tone: "text-workflow",
    },
  ];

  return (
    <section
      className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5"
      aria-label="Report totals"
    >
      {cards.map((card) => (
        <Card
          key={card.label}
          className="min-h-[88px] justify-center gap-0 rounded-[18px] py-0 shadow-[var(--shadow-card)] ring-border"
        >
          <CardContent className="px-5 py-4">
            <p className="text-xs font-semibold text-muted-foreground">{card.label}</p>
            <p className={`mt-1 font-numeric text-2xl font-bold ${card.tone}`}>
              {loading ? "—" : card.value}
            </p>
            <p className="mt-0.5 truncate text-[0.6875rem] text-muted-foreground">
              {loading ? "" : card.hint}
            </p>
          </CardContent>
        </Card>
      ))}
    </section>
  );
}
