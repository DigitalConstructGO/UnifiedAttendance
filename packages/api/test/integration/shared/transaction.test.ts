import { beforeEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import { branches, employees, roles, user, userRoles } from "@UnifiedAttendance/db/schema/index";

import { withTransaction } from "../../../src/context";
import { createEmployee, transitionEmployment } from "../../../src/modules/workforce/service";
import { resetDatabase, testContext } from "../../fixtures";

const context = testContext("admin");

describe("withTransaction", () => {
  let branchId: string;
  let otherBranchId: string;

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
    const [branch] = await db
      .insert(branches)
      .values({ name: "Head Office", code: "HQ" })
      .returning();
    const [other] = await db
      .insert(branches)
      .values({ name: "Branch Office", code: "BR" })
      .returning();
    branchId = branch!.id;
    otherBranchId = other!.id;
  });

  it("rolls back every service that ran inside it", async () => {
    await expect(
      withTransaction(context, async (ctx) => {
        const created = await createEmployee(ctx, {
          person: { firstName: "Aster", lastName: "Mekonnen" },
          employee: {
            branchId,
            employeeCode: "EMP-100",
            employmentType: "permanent",
            hireDate: "2026-01-01",
          },
        });
        await transitionEmployment(ctx, {
          employeeId: created.employee.id,
          branchId: otherBranchId,
          employmentType: "permanent",
          effectiveFrom: "2026-02-01",
          status: "active",
        });
        throw new Error("the caller failed after both writes");
      }),
    ).rejects.toThrow("the caller failed after both writes");

    const rows = await db.select({ id: employees.id }).from(employees);
    expect(rows).toEqual([]);
  });

  it("commits both services when the caller succeeds", async () => {
    const employeeId = await withTransaction(context, async (ctx) => {
      const created = await createEmployee(ctx, {
        person: { firstName: "Bereket", lastName: "Tadesse" },
        employee: {
          branchId,
          employeeCode: "EMP-101",
          employmentType: "permanent",
          hireDate: "2026-01-01",
        },
      });
      await transitionEmployment(ctx, {
        employeeId: created.employee.id,
        branchId: otherBranchId,
        employmentType: "permanent",
        effectiveFrom: "2026-02-01",
        status: "active",
      });
      return created.employee.id;
    });

    const [employee] = await db
      .select({ branchId: employees.branchId })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);
    expect(employee?.branchId).toBe(otherBranchId);
  });
});
