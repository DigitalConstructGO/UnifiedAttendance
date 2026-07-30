import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { EmployeeRow, EmploymentPeriod } from "@/lib/api";

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
        <CardTitle className="font-bold">
          {selected.person.firstName} {selected.person.lastName}
        </CardTitle>
        <p className="text-xs text-muted-foreground">Employment history</p>
      </CardHeader>
      <CardContent>
        {periods.length > 0 ? (
          <ol className="space-y-3 text-xs">
            {periods.map((period) => (
              <li key={period.id} className="rounded-[11px] bg-[var(--surface-subtle)] p-3">
                <span className="text-strong font-bold">
                  {period.status[0].toUpperCase() + period.status.slice(1)}
                </span>
                <span className="mt-1 block text-muted-foreground">
                  {period.effectiveFrom} — {period.effectiveTo ?? "Current"}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-xs text-muted-foreground">No employment history is available.</p>
        )}
      </CardContent>
    </Card>
  );
}
