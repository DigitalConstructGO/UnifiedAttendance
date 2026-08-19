import { describe, expect, it } from "vitest";

import {
  deriveWeekStartWeekday,
  weekWindowFor,
} from "../../../src/modules/notifications/week-window";

describe("deriveWeekStartWeekday", () => {
  it("defaults to Monday when every weekday is a working day", () => {
    const days = Array.from({ length: 7 }, (_, weekday) => ({ weekday, isWorkingDay: true }));

    expect(deriveWeekStartWeekday(days)).toBe(0);
  });

  it("resets on Monday when only Sunday is a rest day", () => {
    const days = Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      isWorkingDay: weekday !== 6, // Sunday (6) is off
    }));

    expect(deriveWeekStartWeekday(days)).toBe(0);
  });

  it("resets on Sunday for a Friday+Saturday weekend block", () => {
    const days = Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      isWorkingDay: weekday !== 4 && weekday !== 5, // Friday (4) and Saturday (5) are off
    }));

    expect(deriveWeekStartWeekday(days)).toBe(6); // Sunday
  });

  it("falls back to the smallest start-of-run weekday for a fragmented schedule", () => {
    const days = Array.from({ length: 7 }, (_, weekday) => ({
      weekday,
      isWorkingDay: weekday === 0 || weekday === 2 || weekday === 4, // Mon/Wed/Fri only
    }));

    // Mon (0), Wed (2), and Fri (4) are each a start-of-run weekday here —
    // deterministic fallback picks the smallest.
    expect(deriveWeekStartWeekday(days)).toBe(0);
  });

  it("treats a weekday missing from the input as a working day", () => {
    // Only Sunday's row is supplied and it's a rest day — same result as the
    // full 7-row "Sunday off" case above.
    expect(deriveWeekStartWeekday([{ weekday: 6, isWorkingDay: false }])).toBe(0);
  });

  it("falls back to Monday for an empty input", () => {
    expect(deriveWeekStartWeekday([])).toBe(0);
  });
});

describe("weekWindowFor", () => {
  it("returns the Monday-start window containing a mid-week date", () => {
    // 2026-03-04 is a Wednesday; 2026-03-02 is the Monday before it.
    expect(weekWindowFor("2026-03-04", 0)).toEqual({ start: "2026-03-02", end: "2026-03-09" });
  });

  it("returns the window unchanged when the date given is itself the start", () => {
    expect(weekWindowFor("2026-03-02", 0)).toEqual({ start: "2026-03-02", end: "2026-03-09" });
  });

  it("wraps correctly for a Sunday-start week", () => {
    // 2026-03-06 is a Friday; the Sunday-start week containing it began on
    // 2026-03-01 (the Sunday before 2026-03-02, a Monday).
    expect(weekWindowFor("2026-03-06", 6)).toEqual({ start: "2026-03-01", end: "2026-03-08" });
  });

  it("is half-open — the end date itself belongs to the next window", () => {
    const { end } = weekWindowFor("2026-03-04", 0);
    const next = weekWindowFor(end, 0);
    expect(next.start).toBe(end);
  });
});
