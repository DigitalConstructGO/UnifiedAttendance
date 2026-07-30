import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@UnifiedAttendance/db";
import { manualAttendanceEntries, user } from "@UnifiedAttendance/db/schema/index";

import { type DeriveDayFixture, MONDAY, setUpDeriveDayFixture } from "./derive-day-fixture";

describe("deriveAttendanceDay overlays", () => {
  let fixture: DeriveDayFixture;

  beforeEach(async () => {
    fixture = await setUpDeriveDayFixture();
  });

  it("applies an approved time Correction", async () => {
    await fixture.addEvent("2026-03-02T09:00:00+03:00", "in");
    await fixture.addCorrection("approved");

    await expect(fixture.derive()).resolves.toMatchObject({
      outcome: "present",
      lastOut: new Date("2026-03-02T17:00:00+03:00"),
      hasApprovedCorrection: true,
    });
  });

  it("applies an approved mark-absent Correction", async () => {
    await fixture.addEvent("2026-03-02T09:00:00+03:00", "in");
    await fixture.addEvent("2026-03-02T17:00:00+03:00", "out");
    await fixture.addCorrection("approved", "mark_absent");

    await expect(fixture.derive()).resolves.toMatchObject({
      outcome: "absent",
      firstIn: null,
      lastOut: null,
      missingCheckIn: true,
      missingCheckOut: true,
    });
  });

  it("applies an approved mark-present Correction", async () => {
    await fixture.addCorrection("approved", "mark_present");

    await expect(fixture.derive()).resolves.toMatchObject({ outcome: "present" });
  });

  it("applies an approved excuse-lateness Correction", async () => {
    await fixture.addEvent("2026-03-02T09:15:00+03:00", "in");
    await fixture.addEvent("2026-03-02T17:00:00+03:00", "out");
    await fixture.addCorrection("approved", "excuse_lateness");

    await expect(fixture.derive()).resolves.toMatchObject({
      outcome: "present",
      lateMinutes: 0,
    });
  });

  it("combines an auditable manual check-out with an immutable device check-in", async () => {
    const administratorId = "00000000-0000-4000-8000-000000000002";
    await db.insert(user).values({
      id: administratorId,
      name: "Administrator",
      email: "administrator@example.test",
      emailVerified: true,
    });
    await fixture.addEvent("2026-03-02T09:00:00+03:00", "in");
    await db.insert(manualAttendanceEntries).values({
      employeeId: fixture.employeeId,
      attendanceDate: MONDAY,
      kind: "check_out",
      occurredAt: new Date("2026-03-02T17:00:00+03:00"),
      reason: "Device was offline at closing time",
      createdBy: administratorId,
    });

    await expect(fixture.derive()).resolves.toMatchObject({
      outcome: "present",
      workedMinutes: 480,
      lastOut: new Date("2026-03-02T17:00:00+03:00"),
    });
  });

  it.each(["pending", "rejected"] as const)("ignores a %s Correction", async (status) => {
    await fixture.addEvent("2026-03-02T09:00:00+03:00", "in");
    await fixture.addCorrection(status);

    await expect(fixture.derive()).resolves.toMatchObject({
      outcome: "partial",
      lastOut: null,
      hasApprovedCorrection: false,
    });
  });
});
