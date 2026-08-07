import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@UnifiedAttendance/db";
import { branchWorkingDays } from "@UnifiedAttendance/db/schema/index";

import { mondayFirstWeekday } from "../../../src/attendance/day-context";
import { setUpDeriveDayFixture, type DeriveDayFixture } from "./derive-day-fixture";


describe("weekday alignment", () => {
  it("maps each date onto the row the organization screen wrote", () => {
    // 2026-03-02 is a Monday.
    expect(mondayFirstWeekday("2026-03-02")).toBe(0);
    expect(mondayFirstWeekday("2026-03-03")).toBe(1);
    expect(mondayFirstWeekday("2026-03-06")).toBe(4); // Friday
    expect(mondayFirstWeekday("2026-03-07")).toBe(5); // Saturday
    expect(mondayFirstWeekday("2026-03-08")).toBe(6); // Sunday
  });

  describe("against a full working week", () => {
    let fixture: DeriveDayFixture;

    beforeEach(async () => {
      fixture = await setUpDeriveDayFixture();
      await db
        .insert(branchWorkingDays)
        .values(
          [1, 2, 3, 4, 5, 6].map((weekday) => ({
            branchId: fixture.branchId,
            weekday,
            isWorkingDay: weekday <= 4,
            openingTime: weekday <= 4 ? "09:00:00" : null,
            closingTime: weekday <= 4 ? "17:00:00" : null,
          })),
        )
        .onConflictDoNothing();
    });

    it("treats Friday as a working day", async () => {
      // Nobody punched, so a working Friday is an absence.
      await expect(fixture.derive("2026-03-06")).resolves.toMatchObject({
        dayType: "working_day",
        outcome: "absent",
      });
    });

    it("treats Sunday as the weekend", async () => {
      await expect(fixture.derive("2026-03-08")).resolves.toMatchObject({
        dayType: "weekend",
      });
    });

    it("counts Friday lateness against Friday's opening time", async () => {
      await fixture.addEvent("2026-03-06T09:20:00+03:00", "in");
      await fixture.addEvent("2026-03-06T17:00:00+03:00", "out");

      await expect(fixture.derive("2026-03-06")).resolves.toMatchObject({
        dayType: "working_day",
        outcome: "present",
        lateMinutes: 20,
      });
    });
  });
});
