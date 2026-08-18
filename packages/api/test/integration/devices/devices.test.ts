 import { beforeEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import { branches, roles, user, userRoles } from "@UnifiedAttendance/db/schema/index";

import { deviceHealth } from "../../../src/modules/devices/health";
import {
  assignIdentity,
  closeIdentity,
  createDevice,
  listIdentities,
} from "../../../src/modules/devices/service";
import { createEmployee } from "../../../src/modules/workforce/service";
import { resetDatabase, testContext } from "../../fixtures";

const officer = testContext("officer");

describe("device enrolments", () => {
  let branchId: string;
  let hanna: string;
  let dawit: string;

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
      .values({ name: "Head Office", code: "HQ" })
      .returning();
    branchId = branch!.id;

    const make = async (firstName: string, code: string) => {
      const created = await createEmployee(officer, {
        person: { firstName, lastName: "Girma" },
        employee: {
          branchId,
          employeeCode: code,
          employmentType: "permanent",
          hireDate: "2026-01-05",
          status: "active",
        },
      } as never);
      return created.employee.id;
    };
    hanna = await make("Hanna", "EMP-500");
    dawit = await make("Dawit", "EMP-501");
  });

  it("refuses a badge that someone else is still holding", async () => {
    await assignIdentity(officer, {
      employeeId: hanna,
      deviceIdentityNumber: "1001",
      validFrom: "2026-02-01",
      validTo: null,
    } as never);

    await expect(
      assignIdentity(officer, {
        employeeId: dawit,
        deviceIdentityNumber: "1001",
        validFrom: "2026-02-02",
        validTo: null,
      } as never),
    ).rejects.toThrow(/still in use by another employee/i);
  });

  it("frees the badge once it is released, and keeps the history", async () => {
    const first = await assignIdentity(officer, {
      employeeId: hanna,
      deviceIdentityNumber: "1001",
      validFrom: "2026-02-01",
      validTo: null,
    } as never);
    await closeIdentity(officer, { id: first!.id, validTo: "2026-02-10" } as never);

    await assignIdentity(officer, {
      employeeId: dawit,
      deviceIdentityNumber: "1001",
      validFrom: "2026-02-11",
      validTo: null,
    } as never);

    // Released, not deleted: the punches Hanna made under 1001 stay explainable.
    const history = await listIdentities(officer, { employeeId: hanna } as never);
    expect(history).toHaveLength(1);
    expect(history[0]?.validTo).toBe("2026-02-10");
  });

  it("lists the badge in force first", async () => {
    const old = await assignIdentity(officer, {
      employeeId: hanna,
      deviceIdentityNumber: "1001",
      validFrom: "2026-01-01",
      validTo: null,
    } as never);
    await closeIdentity(officer, { id: old!.id, validTo: "2026-01-31" } as never);
    await assignIdentity(officer, {
      employeeId: hanna,
      deviceIdentityNumber: "2002",
      validFrom: "2026-02-01",
      validTo: null,
    } as never);

    const history = await listIdentities(officer, { employeeId: hanna } as never);
    expect(history.map((row) => row.deviceIdentityNumber)).toEqual(["2002", "1001"]);
  });
});

describe("device health", () => {
  const now = new Date("2026-02-09T12:00:00.000Z");

  it("reads a reader by when it last reported, not by its status field", () => {
    expect(deviceHealth({ status: "active", lastSeenAt: "2026-02-09T11:59:30.000Z" }, now)).toBe(
      "online",
    );
    expect(deviceHealth({ status: "active", lastSeenAt: "2026-02-09T11:58:00.000Z" }, now)).toBe(
      "warning",
    );
    expect(deviceHealth({ status: "active", lastSeenAt: "2026-02-09T10:00:00.000Z" }, now)).toBe(
      "offline",
    );

    expect(deviceHealth({ status: "active", lastSeenAt: null }, now)).toBe("offline");
    expect(deviceHealth({ status: "inactive", lastSeenAt: "2026-02-09T11:59:00.000Z" }, now)).toBe(
      "offline",
    );
  });

  it("registers a reader that has never been heard from", async () => {
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
      .values({ name: "Head Office", code: "HQ" })
      .returning();

    const device = await createDevice(officer, {
      branchId: branch!.id,
      name: "Main gate",
      serialNumber: "ZK-0001",
      model: null,
      ipAddress: null,
      firmwareVersion: null,
    } as never);

    expect(device!.lastSeenAt).toBeNull();
    expect(deviceHealth(device!)).toBe("offline");
  });
});
