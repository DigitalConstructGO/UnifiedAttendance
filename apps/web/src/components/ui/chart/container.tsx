"use client";

import * as React from "react";
import { ResponsiveContainer } from "recharts";

import { cn } from "@/lib/utils";

import { type ChartConfig, ChartContextProvider, THEMES } from "./context";

/** Recharts hard-codes `#ccc`/`#fff` on its own elements; these overrides pull them back onto our tokens. */
const RECHARTS_RESETS = [
  "[&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground",
  "[&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/60",
  "[&_.recharts-curve.recharts-tooltip-cursor]:stroke-border",
  "[&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border",
  "[&_.recharts-radial-bar-background-sector]:fill-muted",
  "[&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted",
  "[&_.recharts-reference-line_[stroke='#ccc']]:stroke-border",
  "[&_.recharts-sector[stroke='#fff']]:stroke-transparent",
  "[&_.recharts-dot[stroke='#fff']]:stroke-transparent",
  "[&_.recharts-layer]:outline-hidden",
  "[&_.recharts-sector]:outline-hidden",
  "[&_.recharts-surface]:outline-hidden",
].join(" ");

/** Publishes each config colour as `--color-<key>`, per theme, scoped to this one chart. */
function ChartStyle({ id, config }: { id: string; config: ChartConfig }) {
  const coloured = Object.entries(config).filter(([, item]) => item.theme ?? item.color);
  if (coloured.length === 0) return null;

  const css = Object.entries(THEMES)
    .map(([theme, prefix]) => {
      const declarations = coloured
        .map(([key, item]) => {
          const color = item.theme?.[theme as keyof typeof THEMES] ?? item.color;
          return color ? `  --color-${key}: ${color};` : null;
        })
        .filter(Boolean)
        .join("\n");
      return `${prefix} [data-chart=${id}] {\n${declarations}\n}`;
    })
    .join("\n");

  // The values come from a local, developer-authored config — never from user input.
  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

export function ChartContainer({
  id,
  className,
  children,
  config,
  ...props
}: React.ComponentProps<"div"> & {
  config: ChartConfig;
  children: React.ComponentProps<typeof ResponsiveContainer>["children"];
}) {
  const uniqueId = React.useId();
  const chartId = `chart-${id ?? uniqueId.replace(/:/g, "")}`;

  return (
    <ChartContextProvider value={{ config }}>
      <div
        data-slot="chart"
        data-chart={chartId}
        className={cn("flex aspect-video justify-center text-xs", RECHARTS_RESETS, className)}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        {/*
          recharts defaults `initialDimension` to -1x-1 and warns about it during
          the first render — before its ResizeObserver has measured anything — so
          every chart logs "width(-1) and height(-1) should be greater than 0" on
          mount. A 1x1 placeholder is replaced on the very next frame by the real
          measurement, and is no more visible than the -1 it replaces.
        */}
        <ResponsiveContainer initialDimension={{ width: 1, height: 1 }}>
          {children}
        </ResponsiveContainer>
      </div>
    </ChartContextProvider>
  );
}

export { ChartStyle };
