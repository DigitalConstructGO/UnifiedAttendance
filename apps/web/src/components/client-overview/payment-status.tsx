"use client";

import { Cell, Label, Pie, PieChart } from "recharts";

import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import type { ClientOverview } from "@/lib/api";
import { money } from "@/lib/client-presentation";

import { TabPanel } from "../client-profile/tab-shell";
import { compactAmount, measureNumber, shareOf } from "./measure";

const CHART_CONFIG = {
  collected: { label: "Collected", color: "var(--success)" },
  outstanding: { label: "Outstanding", color: "var(--warning)" },
  overdue: { label: "Overdue", color: "var(--destructive)" },
} satisfies ChartConfig;

const SLICES = [
  { key: "collected", label: "Collected", fill: "var(--success)", tone: "bg-success" },
  { key: "outstanding", label: "Outstanding", fill: "var(--warning)", tone: "bg-warning" },
  { key: "overdue", label: "Overdue", fill: "var(--destructive)", tone: "bg-destructive" },
] as const;

export function PaymentStatus({
  paymentDistribution,
}: Pick<ClientOverview, "paymentDistribution">) {
  const amounts = {
    collected: measureNumber(paymentDistribution.collected),
    outstanding: measureNumber(paymentDistribution.currentOutstanding),
    overdue: measureNumber(paymentDistribution.overdue),
  };
  const billed = amounts.collected + amounts.outstanding + amounts.overdue;
  const share = shareOf(billed);

  const rows = SLICES.map((slice) => ({ ...slice, amount: amounts[slice.key] })).filter(
    (slice) => slice.amount > 0,
  );

  return (
    <TabPanel className="p-5">
      <h2 className="text-strong font-heading text-base font-bold">Payment status</h2>
      {billed > 0 ? (
        <>
          <ChartContainer config={CHART_CONFIG} className="mx-auto mt-4 aspect-square h-44">
            <PieChart>
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    hideLabel
                    nameKey="key"
                    formatter={(value, name) => (
                      <div className="flex flex-1 items-center justify-between gap-4 leading-none">
                        <span className="text-muted-foreground">
                          {CHART_CONFIG[name as keyof typeof CHART_CONFIG]?.label ?? name}
                        </span>
                        <span className="text-strong font-medium tabular-nums">
                          {money(Number(value))} · {share(Number(value))}%
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Pie
                data={rows}
                dataKey="amount"
                nameKey="key"
                innerRadius="62%"
                outerRadius="92%"
                paddingAngle={rows.length > 1 ? 2 : 0}
                strokeWidth={0}
              >
                {rows.map((slice) => (
                  <Cell key={slice.key} fill={slice.fill} />
                ))}
                <Label content={({ viewBox }) => <DonutTotal viewBox={viewBox} billed={billed} />} />
              </Pie>
            </PieChart>
          </ChartContainer>
          <ul className="mt-4 grid gap-2">
            {SLICES.map((slice) => (
              <li key={slice.key} className="flex items-center justify-between gap-3">
                <span className="text-strong flex items-center gap-2 text-xs font-semibold">
                  <span aria-hidden="true" className={`size-2 rounded-full ${slice.tone}`} />
                  {slice.label}
                </span>
                <span className="text-xs text-muted-foreground tabular-nums">
                  {money(amounts[slice.key])} · {share(amounts[slice.key])}%
                </span>
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-4 text-xs text-muted-foreground">Nothing has been billed yet.</p>
      )}
    </TabPanel>
  );
}

/** The billed total sits in the donut hole, where the ring would otherwise read as a bare shape. */
function DonutTotal({ viewBox, billed }: { viewBox?: unknown; billed: number }) {
  if (!viewBox || typeof viewBox !== "object" || !("cx" in viewBox)) return null;
  const { cx, cy } = viewBox as { cx: number; cy: number };

  return (
    <text x={cx} y={cy} textAnchor="middle">
      <tspan x={cx} dy="-0.1em" className="fill-[var(--text-strong)] font-heading text-lg font-bold">
        {compactAmount(billed)}
      </tspan>
      <tspan x={cx} dy="1.4em" className="fill-muted-foreground text-[0.6875rem]">
        billed
      </tspan>
    </text>
  );
}
