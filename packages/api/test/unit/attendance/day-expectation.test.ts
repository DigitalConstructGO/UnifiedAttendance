import { describe, expect, it } from "vitest";

import { dayExpectation } from "../../../src/attendance/day-expectation";

// Africa/Addis_Ababa is UTC+3 with no DST, so local 09:00 is 06:00Z.
const TIMEZONE = "Africa/Addis_Ababa";
const MONDAY = "2026-03-02";
const OPEN = { isWorkingDay: true, openingTime: "09:00:00", closingTime: "17:00:00" };
const CLOSED = { isWorkingDay: false, openingTime: null, closingTime: null };

describe("dayExpectation", () => {
  it("expects the branch's opening and closing times on a working day", () => {
    const result = dayExpectation({
      attendanceDate: MONDAY,
      timezone: TIMEZONE,
      workingDay: OPEN,
      holiday: null,
    });

    expect(result).toEqual({
      dayType: "working_day",
      holidayName: null,
      dayStart: new Date("2026-03-01T21:00:00Z"),
      dayEnd: new Date("2026-03-02T21:00:00Z"),
      expectedStart: new Date("2026-03-02T06:00:00Z"),
      expectedEnd: new Date("2026-03-02T14:00:00Z"),
    });
  });

  it("expects nothing on a rest day", () => {
    const result = dayExpectation({
      attendanceDate: MONDAY,
      timezone: TIMEZONE,
      workingDay: CLOSED,
      holiday: null,
    });

    expect(result).toMatchObject({ dayType: "weekend", expectedStart: null, expectedEnd: null });
  });

  it("treats a weekday with no schedule row as a rest day", () => {
    const result = dayExpectation({
      attendanceDate: MONDAY,
      timezone: TIMEZONE,
      workingDay: null,
      holiday: null,
    });

    expect(result).toMatchObject({ dayType: "weekend", expectedStart: null, expectedEnd: null });
  });

  it("expects nothing on a holiday, even though the weekday is normally worked", () => {
    // This is the Mewulid case: a Tuesday schedule exists, but the holiday wins.
    const result = dayExpectation({
      attendanceDate: MONDAY,
      timezone: TIMEZONE,
      workingDay: OPEN,
      holiday: { name: "Mewulid" },
    });

    expect(result).toEqual({
      dayType: "holiday",
      holidayName: "Mewulid",
      dayStart: new Date("2026-03-01T21:00:00Z"),
      dayEnd: new Date("2026-03-02T21:00:00Z"),
      expectedStart: null,
      expectedEnd: null,
    });
  });

  it("ignores stored times on a day flagged as not worked", () => {
    const result = dayExpectation({
      attendanceDate: MONDAY,
      timezone: TIMEZONE,
      workingDay: { isWorkingDay: false, openingTime: "09:00:00", closingTime: "17:00:00" },
      holiday: null,
    });

    expect(result).toMatchObject({ dayType: "weekend", expectedStart: null, expectedEnd: null });
  });
});
