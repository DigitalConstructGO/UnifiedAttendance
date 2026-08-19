import { beforeEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import { roles, user, userRoles } from "@UnifiedAttendance/db/schema/index";

import {
  createNotificationTier,
  deleteNotificationTier,
  listNotificationTiers,
  updateNotificationTier,
} from "../../../src/modules/notifications/service";
import { resetDatabase, testContext } from "../../fixtures";

async function assignRole(userId: string, roleName: string) {
  await db.insert(user).values({
    id: userId,
    name: userId,
    email: `${userId}@example.test`,
    emailVerified: true,
  });
  const [role] = await db.select().from(roles).where(eq(roles.name, roleName)).limit(1);
  await db.insert(userRoles).values({ userId, roleId: role!.id });
}

const admin = testContext("admin");
const manager = testContext("manager");
const hr = testContext("hr");

describe("notification tiers", () => {
  beforeEach(async () => {
    await resetDatabase();
    await assignRole("admin", "Admin");
    await assignRole("manager", "Manager");
    await assignRole("hr", "HR");
  });

  it("comes with one seeded default tier per condition", async () => {
    const late = await listNotificationTiers(admin, { condition: "late" });
    const absent = await listNotificationTiers(admin, { condition: "absent" });

    expect(late).toHaveLength(1);
    expect(late[0]).toMatchObject({ condition: "late", threshold: 1 });
    expect(absent).toHaveLength(1);
    expect(absent[0]).toMatchObject({ condition: "absent", threshold: 1 });
  });

  it("lists tiers for a condition ordered by threshold", async () => {
    await createNotificationTier(admin, {
      condition: "late",
      threshold: 3,
      subjectTemplate: "Third notice",
      bodyTemplate: "Body",
    });
    await createNotificationTier(admin, {
      condition: "late",
      threshold: 2,
      subjectTemplate: "Second notice",
      bodyTemplate: "Body",
    });

    const tiers = await listNotificationTiers(admin, { condition: "late" });
    expect(tiers.map((tier) => tier.threshold)).toEqual([1, 2, 3]);
  });

  it("lists every condition when none is given", async () => {
    const tiers = await listNotificationTiers(admin);
    expect(tiers.map((tier) => tier.condition).sort()).toEqual(["absent", "late"]);
  });

  it("creates a tier", async () => {
    const tier = await createNotificationTier(admin, {
      condition: "absent",
      threshold: 2,
      subjectTemplate: "Second absence notice",
      bodyTemplate: "Hi {{employeeName}}, this is your {{occurrenceCount}}th absence.",
    });

    expect(tier).toMatchObject({ condition: "absent", threshold: 2 });
    const tiers = await listNotificationTiers(admin, { condition: "absent" });
    expect(tiers.map((row) => row.threshold)).toEqual([1, 2]);
  });

  it("refuses to create a duplicate (condition, threshold) pair", async () => {
    await expect(
      createNotificationTier(admin, {
        condition: "late",
        threshold: 1,
        subjectTemplate: "Duplicate",
        bodyTemplate: "Body",
      }),
    ).rejects.toThrow(/already exists/i);
  });

  it("updates a tier", async () => {
    const tier = await createNotificationTier(admin, {
      condition: "late",
      threshold: 4,
      subjectTemplate: "Fourth notice",
      bodyTemplate: "Body",
    });

    const updated = await updateNotificationTier(admin, {
      id: tier!.id,
      subjectTemplate: "Updated subject",
    });

    expect(updated).toMatchObject({ subjectTemplate: "Updated subject", threshold: 4 });
  });

  it("refuses to update a tier's threshold onto another tier of the same condition", async () => {
    const tier = await createNotificationTier(admin, {
      condition: "late",
      threshold: 5,
      subjectTemplate: "Fifth notice",
      bodyTemplate: "Body",
    });

    await expect(
      updateNotificationTier(admin, { id: tier!.id, threshold: 1 }),
    ).rejects.toThrow(/already exists/i);
  });

  it("allows a tier to keep its own threshold when updating other fields", async () => {
    const tier = await createNotificationTier(admin, {
      condition: "late",
      threshold: 6,
      subjectTemplate: "Sixth notice",
      bodyTemplate: "Body",
    });

    const updated = await updateNotificationTier(admin, {
      id: tier!.id,
      threshold: 6,
      bodyTemplate: "New body",
    });

    expect(updated).toMatchObject({ threshold: 6, bodyTemplate: "New body" });
  });

  it("deletes a tier", async () => {
    const tier = await createNotificationTier(admin, {
      condition: "absent",
      threshold: 3,
      subjectTemplate: "Third absence notice",
      bodyTemplate: "Body",
    });

    await deleteNotificationTier(admin, { id: tier!.id });

    const tiers = await listNotificationTiers(admin, { condition: "absent" });
    expect(tiers.map((row) => row.id)).not.toContain(tier!.id);
  });

  it("allows deleting the last remaining tier for a condition", async () => {
    const tiers = await listNotificationTiers(admin, { condition: "absent" });
    expect(tiers).toHaveLength(1);

    await deleteNotificationTier(admin, { id: tiers[0]!.id });

    expect(await listNotificationTiers(admin, { condition: "absent" })).toHaveLength(0);
  });

  it("lets HR create, update, and delete tiers, not just Admin", async () => {
    const tier = await createNotificationTier(hr, {
      condition: "late",
      threshold: 7,
      subjectTemplate: "HR-created notice",
      bodyTemplate: "Body",
    });
    expect(tier).toMatchObject({ condition: "late", threshold: 7 });

    const updated = await updateNotificationTier(hr, {
      id: tier!.id,
      subjectTemplate: "HR-updated notice",
    });
    expect(updated).toMatchObject({ subjectTemplate: "HR-updated notice" });

    await deleteNotificationTier(hr, { id: tier!.id });
    const tiers = await listNotificationTiers(hr, { condition: "late" });
    expect(tiers.map((row) => row.id)).not.toContain(tier!.id);
  });

  it("rejects a role without notifications.manage", async () => {
    await expect(listNotificationTiers(manager, { condition: "late" })).rejects.toThrow(
      /missing permission/i,
    );
    await expect(
      createNotificationTier(manager, {
        condition: "late",
        threshold: 9,
        subjectTemplate: "Nope",
        bodyTemplate: "Nope",
      }),
    ).rejects.toThrow(/missing permission/i);
  });
});
