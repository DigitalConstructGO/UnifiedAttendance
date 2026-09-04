export type Grain = "week" | "month" | "year";
export type Measure = "invoiced" | "collected";
export type Window = { from: string; to: string };

/** How many years a "year" grain shows at once. */
const YEAR_SPAN = 5;

const at = (date: string) => new Date(`${date}T12:00:00Z`);
const toDate = (value: Date) => value.toISOString().slice(0, 10);

function lastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

/**
 * The window a grain is navigated in: weeks sit inside a month, months inside a
 * year, years inside a five-year span. Each step of the navigator moves one
 * whole window, so the arrows always land on a calendar boundary.
 */
export function windowFor(grain: Grain, anchor: string): Window {
  const date = at(anchor);
  const year = date.getUTCFullYear();
  if (grain === "week") {
    const month = date.getUTCMonth();
    const padded = String(month + 1).padStart(2, "0");
    return {
      from: `${year}-${padded}-01`,
      to: `${year}-${padded}-${lastDayOfMonth(year, month)}`,
    };
  }
  if (grain === "month") {
    return { from: `${year}-01-01`, to: `${year}-12-31` };
  }
  return { from: `${year - (YEAR_SPAN - 1)}-01-01`, to: `${year}-12-31` };
}

/** Move the anchor one whole window earlier or later. */
export function shiftAnchor(grain: Grain, anchor: string, step: -1 | 1) {
  const date = at(anchor);
  if (grain === "week") date.setUTCMonth(date.getUTCMonth() + step);
  else if (grain === "month") date.setUTCFullYear(date.getUTCFullYear() + step);
  else date.setUTCFullYear(date.getUTCFullYear() + step * YEAR_SPAN);
  return toDate(date);
}

export function windowLabel(grain: Grain, window: Window) {
  if (grain === "week") {
    return new Intl.DateTimeFormat("en-US", {
      month: "long",
      year: "numeric",
      timeZone: "UTC",
    }).format(at(window.from));
  }
  if (grain === "month") return window.from.slice(0, 4);
  return `${window.from.slice(0, 4)} – ${window.to.slice(0, 4)}`;
}

/** The short heading a single column carries. */
export function columnLabel(grain: Grain, period: { period: string; start: string }) {
  if (grain === "year") return period.period;
  if (grain === "month") {
    return new Intl.DateTimeFormat("en-US", { month: "short", timeZone: "UTC" }).format(
      at(period.start),
    );
  }
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  }).format(at(period.start));
}
