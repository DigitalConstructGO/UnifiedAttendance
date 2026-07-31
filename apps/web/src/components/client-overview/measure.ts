import { money } from "@/lib/client-presentation";

/** A reporting figure, `amount: null` meaning the period mixed currencies and cannot be summed. */
export type Measure = { amount: string | null; currency: string | null };

export function measureText(measure: Measure | undefined) {
  if (!measure) return "—";
  if (measure.amount === null) return "Mixed currencies";
  return money(measure.amount, measure.currency ?? "ETB");
}

export function measureNumber(measure: Measure | undefined) {
  return measure?.amount === null || measure?.amount === undefined ? 0 : Number(measure.amount);
}

/** Axis ticks and the donut centre have no room for full figures; tooltips still show them exactly. */
export function compactAmount(value: number) {
  if (value === 0) return "0";
  if (Math.abs(value) >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (Math.abs(value) >= 1_000) return `${Math.round(value / 1_000)}k`;
  return String(Math.round(value));
}

/** `2026-07` reads as `Jul 26` on an axis. */
export function monthLabel(period: string) {
  const [year, month] = period.split("-");
  if (!year || !month) return period;
  const date = new Date(Date.UTC(Number(year), Number(month) - 1, 1));
  return `${date.toLocaleString("en-US", { month: "short", timeZone: "UTC" })} ${year.slice(2)}`;
}

/** Rounds each part against the billed total so the three shares read as percentages of one whole. */
export function shareOf(total: number) {
  return (part: number) => (total === 0 ? 0 : Math.round((part / total) * 100));
}
