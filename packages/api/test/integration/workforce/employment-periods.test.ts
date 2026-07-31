import { beforeEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import {
  branches,
  employmentPeriods,
  roles,
  user,
  userRoles,
} from "@UnifiedAttendance/db/schema/index";

import { createEmployee, transitionEmployment } from "../../../src/modules/workforce/service";
import { resetDatabase, testContext } from "../../fixtures";

const context = testContext("admin");

describe("employment periods", () => {
  let firstBranchId: string;
  let secondBranchId: string;

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
    const [firstBranch] = await db
      .insert(branches)
      .values({ name: "Head Office", code: "HQ" })
      .returning();
    const [secondBranch] = await db
      .insert(branches)
      .values({ name: "Branch Office", code: "BR" })
      .returning();
    firstBranchId = firstBranch!.id;
    secondBranchId = secondBranch!.id;
  });

  it("creates an initial dated assignment and preserves it when an employee transfers", async () => {
    const created = await createEmployee(context, {
      person: { firstName: "Aster", lastName: "Mekonnen" },
      employee: {
        branchId: firstBranchId,
        employeeCode: "EMP-100",
        employmentType: "permanent",
        hireDate: "2026-01-01",
      },
    });

    await transitionEmployment(context, {
      employeeId: created.employee.id,
      branchId: secondBranchId,
      employmentType: "permanent",
      effectiveFrom: "2026-02-01",
      status: "active",
    });

    const periods = await db
      .select()
      .from(employmentPeriods)
      .where(eq(employmentPeriods.employeeId, created.employee.id));

    expect(periods).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          branchId: firstBranchId,
          effectiveFrom: "2026-01-01",
          effectiveTo: "2026-01-31",
        }),
        expect.objectContaining({
          branchId: secondBranchId,
          effectiveFrom: "2026-02-01",
          effectiveTo: null,
        }),
      ]),
    );
  });
});
