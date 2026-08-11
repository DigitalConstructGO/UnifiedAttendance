import { beforeEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import { branches, roles, user, userRoles } from "@UnifiedAttendance/db/schema/index";

import { listBranches, createBranch } from "../../../src/modules/organization/service";
import { createEmployee, updateEmployee } from "../../../src/modules/workforce/employees";
import { resetDatabase, testContext } from "../../fixtures";

const manager = testContext("manager");

const FORBIDDEN = { code: "FORBIDDEN" };

describe("the Manager role", () => {
  let branchId: string;

  beforeEach(async () => {
    await resetDatabase();
    await db.insert(user).values({
      id: "manager",
      name: "Manager",
      email: "manager@example.test",
      emailVerified: true,
    });
    const [managerRole] = await db.select().from(roles).where(eq(roles.name, "Manager")).limit(1);
    await db.insert(userRoles).values({ userId: "manager", roleId: managerRole!.id });
    const [branch] = await db
      .insert(branches)
      .values({ name: "Head Office", code: "HQ" })
      .returning();
    branchId = branch!.id;
  });

  it("hires and edits employees", async () => {
    const created = await createEmployee(manager, {
      person: { firstName: "Aster", lastName: "Mekonnen" },
      employee: { branchId, employmentType: "permanent", hireDate: "2026-01-01" },
    });
    const updated = await updateEmployee(manager, {
      id: created.employee.id,
      person: { firstName: "Renamed" },
    });
    expect(updated.person?.firstName).toBe("Renamed");
  });

  it("sees branches, so client and employee forms can list them", async () => {
    const list = await listBranches(manager);
    expect(list.map((branch) => branch.code)).toContain("HQ");
  });

  it("still cannot reshape the organization itself", async () => {
    await expect(
      createBranch(manager, { name: "Rogue Branch", code: "RB", address: null }),
    ).rejects.toMatchObject(FORBIDDEN);
  });
});
