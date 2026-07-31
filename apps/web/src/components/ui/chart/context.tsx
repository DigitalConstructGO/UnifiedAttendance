"use client";

import * as React from "react";

/** Recharts renders its own DOM, so the theme reaches it as CSS variables rather than classes. */
export const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [key in string]: { label?: React.ReactNode; icon?: React.ComponentType } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

/** What Recharts hands a tooltip or legend renderer. Kept loose — the shape varies per chart type. */
export type ChartPayloadItem = {
  name?: string | number;
  dataKey?: string | number;
  value?: unknown;
  color?: string;
  fill?: string;
  payload?: Record<string, unknown>;
};

const ChartContext = React.createContext<{ config: ChartConfig } | null>(null);

export const ChartContextProvider = ChartContext.Provider;

export function useChart() {
  const context = React.useContext(ChartContext);
  if (!context) {
    throw new Error("useChart must be used within a <ChartContainer />");
  }
  return context;
}

/** Resolves the config entry behind a payload item, which nests the real key differently per chart type. */
export function configFromPayload(config: ChartConfig, payload: unknown, key: string) {
  if (typeof payload !== "object" || payload === null) return undefined;

  const outer = payload as Record<string, unknown>;
  const inner =
    typeof outer.payload === "object" && outer.payload !== null
      ? (outer.payload as Record<string, unknown>)
      : undefined;

  let configKey = key;
  if (typeof outer[key] === "string") {
    configKey = outer[key];
  } else if (inner && typeof inner[key] === "string") {
    configKey = inner[key];
  }

  return configKey in config ? config[configKey] : config[key];
}
