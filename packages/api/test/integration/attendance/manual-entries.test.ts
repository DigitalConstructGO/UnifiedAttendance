import { beforeEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import {
  branches,
  branchWorkingDays,
  roles,
  user,
  userRoles,
} from "@UnifiedAttendance/db/schema/index";

import { createManualAttendanceEntry } from "../../../src/modules/attendance/service";
import { createEmployee } from "../../../src/modules/workforce/service";
import { createManualAttendanceEntryInput } from "../../../src/validations/attendance";
import { resetDatabase, testContext } from "../../fixtures";

const officer = testContext("officer");
const MONDAY = "2026-02-09";

describe("manual attendance entries", () => {
  let employeeId: string;

  beforeEach(async () => {
    await resetDatabase();
    await db.insert(user).values({
      id: "officer",
      name: "Sara Tesfaye",
      email: "sara@example.test",
      emailVerified: true,
    });
    const [admin] = await db.select().from(roles).where(eq(roles.name, "Admin")).limit(1);
    await db.insert(userRoles).values({ userId: "officer", roleId: admin!.id });
    const [branch] = await db
      .insert(branches)
      .values({ name: "Head Office", code: "HQ", timezone: "Africa/Addis_Ababa" })
      .returning();
    await db.insert(branchWorkingDays).values({
      branchId: branch!.id,
      // Monday-first, the order the organization screen stores.
      weekday: 0,
      isWorkingDay: true,
      openingTime: "09:00",
      closingTime: "17:00",
    });
    const created = await createEmployee(officer, {
      person: { firstName: "Hanna", lastName: "Girma" },
      employee: {
        branchId: branch!.id,
        employeeCode: "EMP-500",
        employmentType: "permanent",
        hireDate: "2026-01-05",
        status: "active",
      },
    } as never);
    employeeId = created.employee.id;
  });

  it("records a one-click entry with no typed reason and recomputes the day", async () => {
    // A branch without a reader sends only what the click knows — the route's
    const input = createManualAttendanceEntryInput.parse({
      employeeId,
      attendanceDate: MONDAY,
      kind: "check_in",
      occurredAt: "2026-02-09T09:05:00+03:00",
    });

    const { entry, day } = await createManualAttendanceEntry(officer, input);

    expect(entry?.reason).toBe("Recorded from the daily register");
    expect(day).toMatchObject({
      dayType: "working_day",
      firstIn: new Date("2026-02-09T09:05:00+03:00"),
    });
  });

  it("lets a punch be re-recorded, the newest time winning in either direction", async () => {
    const record = (kind: "check_in" | "check_out", occurredAt: string) =>
      createManualAttendanceEntry(
        officer,
        createManualAttendanceEntryInput.parse({
          employeeId,
          attendanceDate: MONDAY,
          kind,
          occurredAt,
        }),
      );

    await record("check_in", "2026-02-09T08:00:00+03:00");
    const laterIn = await record("check_in", "2026-02-09T09:00:00+03:00");
    expect(laterIn.day.firstIn).toEqual(new Date("2026-02-09T09:00:00+03:00"));

    await record("check_out", "2026-02-09T17:00:00+03:00");
    const earlierOut = await record("check_out", "2026-02-09T16:00:00+03:00");
    expect(earlierOut.day.lastOut).toEqual(new Date("2026-02-09T16:00:00+03:00"));
  });

  it("refuses a check-out when nothing checked the person in", async () => {
    await expect(
      createManualAttendanceEntry(
        officer,
        createManualAttendanceEntryInput.parse({
          employeeId,
          attendanceDate: MONDAY,
          kind: "check_out",
          occurredAt: "2026-02-09T17:00:00+03:00",
        }),
      ),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("refuses a pair that would read leave-then-arrive", async () => {
    const record = (kind: "check_in" | "check_out", occurredAt: string) =>
      createManualAttendanceEntry(
        officer,
        createManualAttendanceEntryInput.parse({
          employeeId,
          attendanceDate: MONDAY,
          kind,
          occurredAt,
        }),
      );

    await record("check_in", "2026-02-09T09:00:00+03:00");
    await expect(record("check_out", "2026-02-09T08:30:00+03:00")).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });

    await record("check_out", "2026-02-09T17:00:00+03:00");
    await expect(record("check_in", "2026-02-09T18:00:00+03:00")).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("still refuses a check-in without a time", () => {
    const parsed = createManualAttendanceEntryInput.safeParse({
      employeeId,
      attendanceDate: MONDAY,
      kind: "check_in",
    });
    expect(parsed.success).toBe(false);
  });
});
