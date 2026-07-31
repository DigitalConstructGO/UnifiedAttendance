"use client";

import { Legend } from "recharts";

import { cn } from "@/lib/utils";

import { configFromPayload, useChart } from "./context";

export const ChartLegend = Legend;

type ChartLegendItem = { value?: unknown; dataKey?: string | number; color?: string };

export function ChartLegendContent({
  className,
  payload,
  verticalAlign = "bottom",
  hideIcon = false,
  nameKey,
}: {
  className?: string;
  payload?: ChartLegendItem[];
  verticalAlign?: "top" | "bottom" | "middle";
  hideIcon?: boolean;
  nameKey?: string;
}) {
  const { config } = useChart();

  if (!payload?.length) return null;

  return (
    <div
      className={cn(
        "flex items-center justify-center gap-4",
        verticalAlign === "top" ? "pb-3" : "pt-3",
        className,
      )}
    >
      {payload.map((item) => {
        const key = `${nameKey ?? item.dataKey ?? "value"}`;
        const itemConfig = configFromPayload(config, item, key);

        return (
          <div key={String(item.value ?? key)} className="flex items-center gap-1.5">
            {itemConfig?.icon && !hideIcon ? (
              <itemConfig.icon />
            ) : (
              <span
                aria-hidden="true"
                className="size-2 shrink-0 rounded-full"
                style={{ backgroundColor: item.color }}
              />
            )}
            <span className="text-xs text-muted-foreground">
              {itemConfig?.label ?? String(item.value ?? "")}
            </span>
          </div>
        );
      })}
    </div>
  );
}
