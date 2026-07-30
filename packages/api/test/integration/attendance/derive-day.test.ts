import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@UnifiedAttendance/db";
import { holidays } from "@UnifiedAttendance/db/schema/index";

import {
  type DeriveDayFixture,
  SATURDAY,
  setUpDeriveDayFixture,
  TUESDAY,
} from "./derive-day-fixture";

describe("deriveAttendanceDay", () => {
  let fixture: DeriveDayFixture;

  beforeEach(async () => {
    fixture = await setUpDeriveDayFixture();
  });

  it("derives an absent working day when there are no Attendance Events", async () => {
    const day = await fixture.derive();

    expect(day).toMatchObject({
      dayType: "working_day",
      outcome: "absent",
      firstIn: null,
      lastOut: null,
      missingCheckIn: true,
      missingCheckOut: true,
    });
  });

  it("uses the first check-in and last check-out to derive a present day", async () => {
    await fixture.addEvent("2026-03-02T09:15:00+03:00", "in");
    await fixture.addEvent("2026-03-02T12:00:00+03:00", "out");
    await fixture.addEvent("2026-03-02T13:00:00+03:00", "in");
    await fixture.addEvent("2026-03-02T16:30:00+03:00", "out");

    const day = await fixture.derive();

    expect(day).toMatchObject({
      outcome: "present",
      firstIn: new Date("2026-03-02T09:15:00+03:00"),
      lastOut: new Date("2026-03-02T16:30:00+03:00"),
      lateMinutes: 15,
      earlyDepartureMinutes: 30,
      missingCheckIn: false,
      missingCheckOut: false,
    });
  });

  it("derives a partial day when only a check-in exists", async () => {
    await fixture.addEvent("2026-03-02T09:00:00+03:00", "in");

    await expect(fixture.derive()).resolves.toMatchObject({
      outcome: "partial",
      missingCheckIn: false,
      missingCheckOut: true,
    });
  });

  it("derives a partial day when only a check-out exists", async () => {
    await fixture.addEvent("2026-03-02T17:00:00+03:00", "out");

    await expect(fixture.derive()).resolves.toMatchObject({
      outcome: "partial",
      missingCheckIn: true,
      missingCheckOut: false,
    });
  });

  it("derives an unknown Outcome when Events have no usable Direction", async () => {
    await fixture.addEvent("2026-03-02T09:00:00+03:00", "unknown");

    await expect(fixture.derive()).resolves.toMatchObject({
      outcome: "unknown",
      missingCheckIn: true,
      missingCheckOut: true,
    });
  });

  it("keeps events outside the branch's local day out of the Attendance Day", async () => {
    await fixture.addEvent("2026-03-01T23:59:59+03:00", "in");
    await fixture.addEvent("2026-03-03T00:00:00+03:00", "out");

    await expect(fixture.derive()).resolves.toMatchObject({ outcome: "absent" });
  });

  it("derives weekend and holiday Day Types independently from Outcome", async () => {
    await fixture.addEvent("2026-03-07T09:00:00+03:00", "in");
    await fixture.addEvent("2026-03-07T17:00:00+03:00", "out");
    await db.insert(holidays).values({
      branchId: fixture.branchId,
      name: "Branch Holiday",
      holidayDate: TUESDAY,
    });

    const weekend = await fixture.derive(SATURDAY);
    const holiday = await fixture.derive(TUESDAY);

    expect(weekend).toMatchObject({ dayType: "weekend", outcome: "present" });
    expect(holiday).toMatchObject({ dayType: "holiday", outcome: "absent" });
  });

  it("updates the existing Attendance Day when recomputed", async () => {
    const first = await fixture.derive();
    await fixture.addEvent("2026-03-02T09:00:00+03:00", "in");
    await fixture.addEvent("2026-03-02T17:00:00+03:00", "out");

    const recomputed = await fixture.derive();

    expect(recomputed).toMatchObject({ id: first.id, outcome: "present" });
  });
});
