import { beforeEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import { branchWorkingDays, roles, user, userRoles } from "@UnifiedAttendance/db/schema/index";

import { createEmployee } from "../../../src/modules/workforce/service";
import {
  archiveBranch,
  createBranch,
  deleteBranch,
  listBranches,
  listWorkingDays,
  replaceWorkingDays,
  restoreBranch,
} from "../../../src/modules/organization/service";
import { resetDatabase, testContext } from "../../fixtures";

const context = testContext("admin");

describe("branch working days", () => {
  beforeEach(async () => {
    await resetDatabase();
    await db.insert(user).values({
      id: "admin",
      name: "Admin",
      email: "admin@example.test",
      emailVerified: true,
    });
    const [adminRole] = await db.select().from(roles).where(eq(roles.name, "Admin")).limit(1);
    await db.insert(userRoles).values({ userId: "admin", roleId: adminRole!.id });
  });

  it("falls back to a Monday-to-Friday week for the very first branch in the system", async () => {
    const branch = await createBranch(context, {
      name: "Dukem",
      code: "DUKEM",
      address: null,
    });

    const days = await listWorkingDays(context, { branchId: branch!.id });
    expect(days).toHaveLength(7);

    const byWeekday = new Map(days.map((day) => [day.weekday, day]));
    expect(byWeekday.get(0)).toMatchObject({
      isWorkingDay: true,
      openingTime: "08:00:00",
      closingTime: "17:00:00",
    });
    expect(byWeekday.get(5)).toMatchObject({
      isWorkingDay: false,
      openingTime: null,
      closingTime: null,
    });
  });

  it("gives a new branch the organization's own configured schedule, not a guess", async () => {
    const dukem = await createBranch(context, { name: "Dukem", code: "DUKEM", address: null });
    // This org actually runs Sunday–Thursday, 09:00–18:00 — reconfigure Dukem to that.
    await replaceWorkingDays(context, {
      branchId: dukem!.id,
      days: Array.from({ length: 7 }, (_, weekday) => {
        const isWorkingDay = weekday === 6 || weekday < 4; // Sun, Mon–Thu
        return {
          weekday,
          isWorkingDay,
          openingTime: isWorkingDay ? "09:00" : null,
          closingTime: isWorkingDay ? "18:00" : null,
        };
      }),
    });

    const secondBranch = await createBranch(context, {
      name: "Adama",
      code: "ADAMA",
      address: null,
    });
    const days = await listWorkingDays(context, { branchId: secondBranch!.id });
    const byWeekday = new Map(days.map((day) => [day.weekday, day]));

    expect(byWeekday.get(0)).toMatchObject({ isWorkingDay: true, openingTime: "09:00:00" });
    expect(byWeekday.get(4)).toMatchObject({ isWorkingDay: false, openingTime: null });
    expect(byWeekday.get(6)).toMatchObject({ isWorkingDay: true, closingTime: "18:00:00" });
  });

  it("backfills a branch that predates automatic schedule seeding, from the org's schedule", async () => {
    await createBranch(context, { name: "Dukem", code: "DUKEM", address: null });
    const legacy = await createBranch(context, { name: "Legacy", code: "LEGACY", address: null });
    // Simulate a branch created before createBranch started seeding a schedule.
    await db.delete(branchWorkingDays).where(eq(branchWorkingDays.branchId, legacy!.id));

    const days = await listWorkingDays(context, { branchId: legacy!.id });
    expect(days).toHaveLength(7);

    const stored = await db
      .select()
      .from(branchWorkingDays)
      .where(eq(branchWorkingDays.branchId, legacy!.id));
    expect(stored).toHaveLength(7);
  });
});

describe("branch archive and delete", () => {
  beforeEach(async () => {
    await resetDatabase();
    await db.insert(user).values({
      id: "admin",
      name: "Admin",
      email: "admin@example.test",
      emailVerified: true,
    });
    const [adminRole] = await db.select().from(roles).where(eq(roles.name, "Admin")).limit(1);
    await db.insert(userRoles).values({ userId: "admin", roleId: adminRole!.id });
  });

  it("hides an archived branch from the active list and shows it in the archive", async () => {
    const branch = await createBranch(context, { name: "Dukem", code: "DUKEM", address: null });

    await archiveBranch(context, { branchId: branch!.id });

    expect((await listBranches(context)).map((row) => row.id)).not.toContain(branch!.id);
    expect((await listBranches(context, { archived: true })).map((row) => row.id)).toContain(
      branch!.id,
    );
  });

  it("brings a branch back with restore", async () => {
    const branch = await createBranch(context, { name: "Dukem", code: "DUKEM", address: null });
    await archiveBranch(context, { branchId: branch!.id });

    await restoreBranch(context, { branchId: branch!.id });

    expect((await listBranches(context)).map((row) => row.id)).toContain(branch!.id);
  });

  it("refuses to delete a branch that is not archived first", async () => {
    const branch = await createBranch(context, { name: "Dukem", code: "DUKEM", address: null });

    await expect(deleteBranch(context, { branchId: branch!.id })).rejects.toThrow();
  });

  it("refuses to delete an archived branch that still has employees on it", async () => {
    const branch = await createBranch(context, { name: "Dukem", code: "DUKEM", address: null });
    await createEmployee(context, {
      person: { firstName: "Aster", lastName: "Mekonnen" },
      employee: {
        branchId: branch!.id,
        employeeCode: "EMP-1",
        employmentType: "permanent",
        hireDate: "2026-01-01",
      },
    });
    await archiveBranch(context, { branchId: branch!.id });

    await expect(deleteBranch(context, { branchId: branch!.id })).rejects.toThrow();
    expect((await listBranches(context, { archived: true })).map((row) => row.id)).toContain(
      branch!.id,
    );
  });

  it("deletes an archived, empty branch for good — schedule included", async () => {
    const branch = await createBranch(context, { name: "Dukem", code: "DUKEM", address: null });
    await archiveBranch(context, { branchId: branch!.id });

    await deleteBranch(context, { branchId: branch!.id });

    const remainingDays = await db
      .select()
      .from(branchWorkingDays)
      .where(eq(branchWorkingDays.branchId, branch!.id));
    expect(remainingDays).toHaveLength(0);
    expect((await listBranches(context, { archived: true })).map((row) => row.id)).not.toContain(
      branch!.id,
    );
  });
});
