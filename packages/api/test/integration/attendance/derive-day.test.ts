import { beforeEach, describe, expect, it } from "vitest";

import { db } from "@UnifiedAttendance/db";
import {
  attendanceCorrections,
  attendanceDevices,
  attendanceEvents,
  branches,
  branchWorkingDays,
  employees,
  holidays,
  people,
  user,
} from "@UnifiedAttendance/db/schema/index";

import { deriveAttendanceDay } from "../../../src/attendance/derive-day";
import { resetDatabase } from "../../fixtures";

const MONDAY = "2026-03-02";
const TUESDAY = "2026-03-03";
const SATURDAY = "2026-03-07";

let branchId: string;
let employeeId: string;
let deviceId: string;

async function addEvent(occurredAt: string, direction: "in" | "out" | "unknown") {
  await db.insert(attendanceEvents).values({
    deviceId,
    employeeId,
    deviceIdentityNumber: "1001",
    occurredAt: new Date(occurredAt),
    direction,
  });
}

async function derive(attendanceDate = MONDAY) {
  return deriveAttendanceDay({ employeeId, attendanceDate });
}

async function addCorrection(
  status: "pending" | "approved" | "rejected",
  type: "add_check_out" | "mark_absent" | "mark_present" | "excuse_lateness" = "add_check_out",
) {
  const reviewerId = "00000000-0000-4000-8000-000000000001";
  await db.insert(user).values({
    id: reviewerId,
    name: "Reviewer",
    email: "reviewer@example.test",
    emailVerified: true,
  });
  await db.insert(attendanceCorrections).values({
    employeeId,
    attendanceDate: MONDAY,
    type,
    proposedTime: type === "add_check_out" ? new Date("2026-03-02T17:00:00+03:00") : null,
    reason: "Attendance Device missed the event",
    status,
    requestedBy: reviewerId,
    reviewedBy: status === "pending" ? null : reviewerId,
    reviewedAt: status === "pending" ? null : new Date("2026-03-03T09:00:00Z"),
  });
}

describe("deriveAttendanceDay", () => {
  beforeEach(async () => {
    await resetDatabase();

    const [branch] = await db
      .insert(branches)
      .values({ name: "Head Office", code: "HQ", timezone: "Africa/Addis_Ababa" })
      .returning();
    branchId = branch!.id;

    await db.insert(branchWorkingDays).values({
      branchId,
      weekday: 1,
      isWorkingDay: true,
      openingTime: "09:00:00",
      closingTime: "17:00:00",
    });

    const [person] = await db
      .insert(people)
      .values({ firstName: "Test", lastName: "Employee" })
      .returning();
    const [employee] = await db
      .insert(employees)
      .values({
        personId: person!.id,
        branchId,
        employeeCode: "EMP-1",
        hireDate: "2024-01-01",
      })
      .returning();
    employeeId = employee!.id;

    const [device] = await db
      .insert(attendanceDevices)
      .values({ branchId, name: "Entrance", serialNumber: "SN-1" })
      .returning();
    deviceId = device!.id;
  });

  it("derives an absent working day when there are no Attendance Events", async () => {
    const day = await derive();

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
    await addEvent("2026-03-02T09:15:00+03:00", "in");
    await addEvent("2026-03-02T12:00:00+03:00", "out");
    await addEvent("2026-03-02T13:00:00+03:00", "in");
    await addEvent("2026-03-02T16:30:00+03:00", "out");

    const day = await derive();

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
    await addEvent("2026-03-02T09:00:00+03:00", "in");

    await expect(derive()).resolves.toMatchObject({
      outcome: "partial",
      missingCheckIn: false,
      missingCheckOut: true,
    });
  });

  it("derives a partial day when only a check-out exists", async () => {
    await addEvent("2026-03-02T17:00:00+03:00", "out");

    await expect(derive()).resolves.toMatchObject({
      outcome: "partial",
      missingCheckIn: true,
      missingCheckOut: false,
    });
  });

  it("derives an unknown Outcome when Events have no usable Direction", async () => {
    await addEvent("2026-03-02T09:00:00+03:00", "unknown");

    await expect(derive()).resolves.toMatchObject({
      outcome: "unknown",
      missingCheckIn: true,
      missingCheckOut: true,
    });
  });

  it("keeps events outside the branch's local day out of the Attendance Day", async () => {
    await addEvent("2026-03-01T23:59:59+03:00", "in");
    await addEvent("2026-03-03T00:00:00+03:00", "out");

    await expect(derive()).resolves.toMatchObject({ outcome: "absent" });
  });

  it("derives weekend and holiday Day Types independently from Outcome", async () => {
    await addEvent("2026-03-07T09:00:00+03:00", "in");
    await addEvent("2026-03-07T17:00:00+03:00", "out");
    await db.insert(holidays).values({
      branchId,
      name: "Branch Holiday",
      holidayDate: TUESDAY,
    });

    const weekend = await derive(SATURDAY);
    const holiday = await derive(TUESDAY);

    expect(weekend).toMatchObject({ dayType: "weekend", outcome: "present" });
    expect(holiday).toMatchObject({ dayType: "holiday", outcome: "absent" });
  });

  it("applies an approved time Correction", async () => {
    await addEvent("2026-03-02T09:00:00+03:00", "in");
    await addCorrection("approved");

    await expect(derive()).resolves.toMatchObject({
      outcome: "present",
      lastOut: new Date("2026-03-02T17:00:00+03:00"),
      hasApprovedCorrection: true,
    });
  });

  it("applies an approved mark-absent Correction", async () => {
    await addEvent("2026-03-02T09:00:00+03:00", "in");
    await addEvent("2026-03-02T17:00:00+03:00", "out");
    await addCorrection("approved", "mark_absent");

    await expect(derive()).resolves.toMatchObject({
      outcome: "absent",
      firstIn: null,
      lastOut: null,
      missingCheckIn: true,
      missingCheckOut: true,
    });
  });

  it("applies an approved mark-present Correction", async () => {
    await addCorrection("approved", "mark_present");

    await expect(derive()).resolves.toMatchObject({ outcome: "present" });
  });

  it("applies an approved excuse-lateness Correction", async () => {
    await addEvent("2026-03-02T09:15:00+03:00", "in");
    await addEvent("2026-03-02T17:00:00+03:00", "out");
    await addCorrection("approved", "excuse_lateness");

    await expect(derive()).resolves.toMatchObject({
      outcome: "present",
      lateMinutes: 0,
    });
  });

  it.each(["pending", "rejected"] as const)("ignores a %s Correction", async (status) => {
    await addEvent("2026-03-02T09:00:00+03:00", "in");
    await addCorrection(status);

    await expect(derive()).resolves.toMatchObject({
      outcome: "partial",
      lastOut: null,
      hasApprovedCorrection: false,
    });
  });

  it("updates the existing Attendance Day when recomputed", async () => {
    const first = await derive();
    await addEvent("2026-03-02T09:00:00+03:00", "in");
    await addEvent("2026-03-02T17:00:00+03:00", "out");

    const recomputed = await derive();

    expect(recomputed).toMatchObject({ id: first.id, outcome: "present" });
  });
});
