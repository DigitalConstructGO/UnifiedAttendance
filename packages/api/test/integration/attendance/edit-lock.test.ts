import { beforeEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import { branches, roles, user, userRoles } from "@UnifiedAttendance/db/schema/index";

import { assertAttendanceDayEditable } from "../../../src/attendance/edit-lock";
import { resetDatabase, testContext } from "../../fixtures";

const hr = testContext("hr");
const admin = testContext("admin");
const superAdmin = testContext("super-admin");

function isoDateInZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(date);
}

describe("attendance day edit lock", () => {
  let branchId: string;

  beforeEach(async () => {
    await resetDatabase();
    const [branch] = await db
      .insert(branches)
      .values({ name: "Head Office", code: "HQ" })
      .returning();
    branchId = branch!.id;

    for (const [userId, roleName] of [
      ["hr", "HR"],
      ["admin", "Admin"],
      ["super-admin", "Super Administrator"],
    ] as const) {
      await db
        .insert(user)
        .values({ id: userId, name: userId, email: `${userId}@example.test`, emailVerified: true });
      const [role] = await db.select().from(roles).where(eq(roles.name, roleName)).limit(1);
      await db.insert(userRoles).values({ userId, roleId: role!.id });
    }
  });

  it("forbids a non-administrator from touching a day more than 24 hours after it closed", async () => {
    await expect(
      assertAttendanceDayEditable(hr, { branchId, attendanceDate: "2020-01-01" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("still allows a non-administrator to edit within the 24-hour window", async () => {
    const today = isoDateInZone(new Date(), "Africa/Addis_Ababa");
    await expect(
      assertAttendanceDayEditable(hr, { branchId, attendanceDate: today }),
    ).resolves.toBeUndefined();
  });

  it("lets Admin and Super Administrator bypass the lock entirely", async () => {
    await expect(
      assertAttendanceDayEditable(admin, { branchId, attendanceDate: "2020-01-01" }),
    ).resolves.toBeUndefined();
    await expect(
      assertAttendanceDayEditable(superAdmin, { branchId, attendanceDate: "2020-01-01" }),
    ).resolves.toBeUndefined();
  });
});
