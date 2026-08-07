"use client";

import { Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { AttendanceSummary } from "@/lib/api";

import type { ReportPreset } from "./period";

/** Signal colors, same meaning as everywhere else in the console. */
const CHART_CONFIG = {
  onTime: { label: "On time", color: "var(--success)" },
  late: { label: "Late", color: "var(--warning)" },
  partial: { label: "Partial", color: "var(--info)" },
  absent: { label: "Absent", color: "var(--destructive)" },
  unrecorded: { label: "Unrecorded", color: "var(--workflow)" },
} satisfies ChartConfig;

const BUCKETS = ["onTime", "late", "partial", "absent", "unrecorded"] as const;

function dayLabel(date: string, preset: ReportPreset) {
  const value = new Date(`${date}T12:00:00Z`);
  // A month of bars only has room for day numbers; a week can name its days.
  if (preset === "month")
    return new Intl.DateTimeFormat("en-US", { day: "numeric", timeZone: "UTC" }).format(value);
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(value);
}

export function SummaryCharts({
  byDay,
  preset,
  loading,
}: {
  byDay: AttendanceSummary["byDay"];
  preset: ReportPreset;
  loading: boolean;
}) {
  const bars = byDay.map((day) => ({ ...day, label: dayLabel(day.date, preset) }));
  const slices = BUCKETS.map((bucket) => ({
    bucket,
    label: CHART_CONFIG[bucket].label,
    value: byDay.reduce((sum, day) => sum + day[bucket], 0),
    fill: CHART_CONFIG[bucket].color,
  })).filter((slice) => slice.value > 0);

  if (!loading && bars.length === 0) return null;

  return (
    <section className="grid gap-3 lg:grid-cols-5" aria-label="Attendance charts">
      <Card className="gap-0 rounded-[18px] py-0 shadow-[var(--shadow-card)] ring-border lg:col-span-3">
        <CardHeader className="border-b border-border px-5 py-4">
          <CardTitle className="text-strong text-sm font-bold">Day by day</CardTitle>
        </CardHeader>
        <CardContent className="px-5 py-4">
          {loading ? (
            <div className="grid h-56 place-items-center" role="status">
              <p className="text-xs text-muted-foreground">Drawing the chart…</p>
            </div>
          ) : (
            <ChartContainer config={CHART_CONFIG} className="aspect-auto h-56 w-full">
              <BarChart accessibilityLayer data={bars} margin={{ top: 8, right: 4, left: 4 }}>
                <CartesianGrid vertical={false} strokeDasharray="3 3" />
                <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
                <YAxis tickLine={false} axisLine={false} width={36} allowDecimals={false} />
                <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                {BUCKETS.map((bucket, index) => (
                  <Bar
                    key={bucket}
                    dataKey={bucket}
                    stackId="day"
                    fill={CHART_CONFIG[bucket].color}
                    radius={index === BUCKETS.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                  />
                ))}
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>

      <Card className="gap-0 rounded-[18px] py-0 shadow-[var(--shadow-card)] ring-border lg:col-span-2">
        <CardHeader className="border-b border-border px-5 py-4">
          <CardTitle className="text-strong text-sm font-bold">Where the days went</CardTitle>
        </CardHeader>
        <CardContent className="px-5 py-4">
          {loading ? (
            <div className="grid h-56 place-items-center" role="status">
              <p className="text-xs text-muted-foreground">Drawing the chart…</p>
            </div>
          ) : (
            <ChartContainer config={CHART_CONFIG} className="aspect-auto h-56 w-full">
              <PieChart accessibilityLayer>
                <ChartTooltip cursor={false} content={<ChartTooltipContent nameKey="bucket" />} />
                <Pie
                  data={slices}
                  dataKey="value"
                  nameKey="bucket"
                  innerRadius={46}
                  outerRadius={78}
                  paddingAngle={2}
                  strokeWidth={0}
                >
                  {slices.map((slice) => (
                    <Cell key={slice.bucket} fill={slice.fill} />
                  ))}
                </Pie>
                <ChartLegend content={<ChartLegendContent nameKey="bucket" />} />
              </PieChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </section>
  );
}
