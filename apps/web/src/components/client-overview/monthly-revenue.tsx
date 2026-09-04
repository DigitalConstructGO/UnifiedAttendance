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
import type { ClientOverview } from "@/lib/api";
import { money } from "@/lib/client-presentation";

import { TabPanel } from "../client-profile/tab-shell";
import { compactAmount, measureNumber, monthLabel } from "./measure";

const CHART_CONFIG = {
  invoiced: { label: "Invoiced", color: "var(--chart-1)" },
  collected: { label: "Collected", color: "var(--chart-2)" },
} satisfies ChartConfig;

export function MonthlyRevenue({ byMonth, period }: Pick<ClientOverview, "byMonth" | "period">) {
  const rows = byMonth.map((row) => ({
    label: monthLabel(row.period),
    invoiced: measureNumber(row.invoiced),
    collected: measureNumber(row.collected),
  }));

  return (
    <TabPanel className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-strong font-heading text-base font-bold">Invoiced by month</h2>
        <p className="text-xs text-muted-foreground">
          {period.from} → {period.to}
        </p>
      </div>
      {rows.length > 0 ? (
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
            <Bar dataKey="invoiced" fill="var(--color-invoiced)" radius={[6, 6, 0, 0]} />
            <Bar dataKey="collected" fill="var(--color-collected)" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ChartContainer>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">
          No invoices issued in this reporting period.
        </p>
      )}
    </TabPanel>
  );
}
