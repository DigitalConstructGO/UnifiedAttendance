import type { RevenueReport } from "@/lib/api";

type Money = RevenueReport["periods"][number]["invoiced"];

export type Delta = {
  percent: number | null;
  direction: "up" | "down" | "flat";
  /** True when the two windows cannot honestly be compared as one figure. */
  incomparable: boolean;
};

/**
 * Growth against the comparison window. Two totals are only comparable when each
 * reduces to a single currency and both use the same one — otherwise there is no
 * honest percentage to show, and we say so rather than inventing one.
 */
export function deltaBetween(current: Money, previous: Money): Delta {
  const incomparable =
    current.amount === null ||
    previous.amount === null ||
    (current.currency !== null &&
      previous.currency !== null &&
      current.currency !== previous.currency);
  if (incomparable) return { percent: null, direction: "flat", incomparable: true };

  const now = Number(current.amount);
  const before = Number(previous.amount);
  if (before === 0) {
    // Growth from nothing has no meaningful percentage — report the direction only.
    return { percent: null, direction: now > 0 ? "up" : "flat", incomparable: false };
  }

  const percent = Math.round(((now - before) / before) * 100);
  return {
    percent,
    direction: percent > 0 ? "up" : percent < 0 ? "down" : "flat",
    incomparable: false,
  };
}

export function deltaText(delta: Delta) {
  if (delta.incomparable) return "—";
  if (delta.percent === null) return delta.direction === "up" ? "New" : "—";
  const sign = delta.percent > 0 ? "+" : "";
  return `${sign}${delta.percent}%`;
}
