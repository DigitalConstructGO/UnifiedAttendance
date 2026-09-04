"use client";

import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { RevenueReport } from "@/lib/api";
import { money } from "@/lib/client-presentation";

import { compactAmount, measureNumber } from "../client-overview/measure";
import { TabPanel } from "../client-profile/tab-shell";
import { columnLabel, type Grain } from "./window";

/**
 * Invoiced and collected keep the same two hues here as on the client
 * dashboard, so a colour means one thing across the whole product. Both series
 * are money on one scale — never a second y-axis.
 */
const CHART_CONFIG = {
  invoiced: { label: "Invoiced", color: "var(--chart-1)" },
  collected: { label: "Collected", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function RevenueChart({
  periods,
  grain,
  label,
}: {
  periods: RevenueReport["periods"];
  grain: Grain;
  label: string;
}) {
  const rows = periods.map((period) => ({
    label: columnLabel(grain, period),
    invoiced: measureNumber(period.invoiced),
    collected: measureNumber(period.collected),
  }));

  const hasRevenue = rows.some((row) => row.invoiced > 0 || row.collected > 0);

  return (
    <TabPanel className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-strong font-heading text-base font-bold">Revenue over time</h2>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
      {hasRevenue ? (
        <ChartContainer config={CHART_CONFIG} className="mt-5 aspect-auto h-56 w-full">
          <BarChart accessibilityLayer data={rows} margin={{ top: 8, right: 4, left: 4 }}>
            <CartesianGrid vertical={false} strokeDasharray="3 3" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={8} />
            <YAxis tickLine={false} axisLine={false} width={44} tickFormatter={compactAmount} />
            <ChartTooltip
              cursor={false}
              content={
                <ChartTooltipContent
                  formatter={(value, name) => (
                    <div className="flex flex-1 items-center justify-between gap-4 leading-none">
                      <span className="text-muted-foreground">
                        {CHART_CONFIG[name as keyof typeof CHART_CONFIG]?.label ?? name}
                      </span>
                      <span className="text-strong font-medium tabular-nums">
                        {money(Number(value))}
                      </span>
                    </div>
                  )}
                />
              }
            />
            <ChartLegend content={<ChartLegendContent />} />
            <Bar dataKey="invoiced" fill="var(--color-invoiced)" radius={[4, 4, 0, 0]} />
            <Bar dataKey="collected" fill="var(--color-collected)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ChartContainer>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">No revenue recorded in {label}.</p>
      )}
    </TabPanel>
  );
}
