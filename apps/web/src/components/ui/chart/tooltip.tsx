"use client";

import type { ReactNode } from "react";
import { Tooltip } from "recharts";

import { cn } from "@/lib/utils";

import { type ChartPayloadItem, configFromPayload, useChart } from "./context";

export const ChartTooltip = Tooltip;

type ChartTooltipContentProps = {
  active?: boolean;
  payload?: ChartPayloadItem[];
  label?: unknown;
  className?: string;
  labelClassName?: string;
  hideLabel?: boolean;
  hideIndicator?: boolean;
  nameKey?: string;
  labelKey?: string;
  labelFormatter?: (value: ReactNode, payload: ChartPayloadItem[]) => ReactNode;
  formatter?: (value: unknown, name: string, item: ChartPayloadItem, index: number) => ReactNode;
};

export function ChartTooltipContent({
  active,
  payload,
  label,
  className,
  labelClassName,
  hideLabel = false,
  hideIndicator = false,
  nameKey,
  labelKey,
  labelFormatter,
  formatter,
}: ChartTooltipContentProps) {
  const { config } = useChart();

  if (!active || !payload?.length) return null;

  const renderLabel = () => {
    if (hideLabel) return null;
    const [item] = payload;
    const key = `${labelKey ?? item?.dataKey ?? item?.name ?? "value"}`;
    const value =
      !labelKey && typeof label === "string"
        ? (config[label]?.label ?? label)
        : configFromPayload(config, item, key)?.label;

    if (labelFormatter) {
      return (
        <div className={cn("font-medium", labelClassName)}>
          {labelFormatter(value as ReactNode, payload)}
        </div>
      );
    }
    return value ? <div className={cn("text-strong font-medium", labelClassName)}>{value}</div> : null;
  };

  return (
    <div
      className={cn(
        "grid min-w-[9rem] gap-1.5 rounded-lg border border-border/60 bg-card px-2.5 py-2",
        "text-xs shadow-[var(--shadow-menu)]",
        className,
      )}
    >
      {renderLabel()}
      <div className="grid gap-1.5">
        {payload.map((item, index) => {
          const key = `${nameKey ?? item.name ?? item.dataKey ?? "value"}`;
          const itemConfig = configFromPayload(config, item, key);
          const swatch = (item.payload?.fill as string | undefined) ?? item.color;

          return (
            <div key={item.dataKey ?? index} className="flex items-center gap-2">
              {hideIndicator ? null : itemConfig?.icon ? (
                <itemConfig.icon />
              ) : (
                <span
                  aria-hidden="true"
                  className="size-2.5 shrink-0 rounded-[3px]"
                  style={{ backgroundColor: swatch }}
                />
              )}
              {formatter ? (
                formatter(item.value, String(item.name ?? key), item, index)
              ) : (
                <div className="flex flex-1 items-center justify-between gap-4 leading-none">
                  <span className="text-muted-foreground">{itemConfig?.label ?? item.name}</span>
                  <span className="text-strong font-medium tabular-nums">
                    {typeof item.value === "number"
                      ? item.value.toLocaleString()
                      : String(item.value ?? "")}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
