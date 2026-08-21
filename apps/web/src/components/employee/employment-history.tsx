import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EmployeeRow, EmploymentPeriod } from "@/lib/api";
import { formatDate } from "@/lib/format-date";
import { EMPLOYEE_STATUS_META } from "@/lib/workforce-presentation";

export function EmploymentHistory({
  selected,
  periods,
}: {
  selected: EmployeeRow;
  periods: EmploymentPeriod[];
}) {
  return (
    <Card className="rounded-[18px] shadow-[var(--shadow-card)] ring-border">
      <CardHeader>
        <CardTitle className="font-bold">Employment history</CardTitle>
        <p className="text-xs text-muted-foreground">
          Dated changes to {selected.person.firstName}&apos;s employment status.
        </p>
      </CardHeader>
      <CardContent>
        {periods.length > 0 ? (
          <ol className="space-y-3 text-xs">
            {periods.map((period) => (
              <li key={period.id} className="rounded-[11px] bg-[var(--surface-subtle)] p-3">
                <span className="text-strong font-bold">
                  {EMPLOYEE_STATUS_META[period.status].label}
                </span>
                <span className="mt-1 block text-muted-foreground">
                  {period.effectiveTo
                    ? `${formatDate(period.effectiveFrom)} – ${formatDate(period.effectiveTo)}`
                    : `Since ${formatDate(period.effectiveFrom)}`}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-xs text-muted-foreground">
            No dated employment records are available for this employee.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
