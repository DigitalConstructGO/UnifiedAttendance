import { beforeEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import { branches, roles, user, userRoles } from "@UnifiedAttendance/db/schema/index";

import {
  createDepartment,
  createEmployee,
  createPosition,
  transitionEmployment,
} from "../../../src/modules/workforce/service";
import { resetDatabase, testContext } from "../../fixtures";

const context = testContext("admin");

describe("positions and departments", () => {
  let branchId: string;
  let softwareId: string;
  let financeId: string;

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
    branchId = branch!.id;
    const software = await createDepartment(context, { name: "Software" });
    const finance = await createDepartment(context, { name: "Finance" });
    softwareId = software!.id;
    financeId = finance!.id;
  });

  function employeeWith(positionId: string, departmentId: string | null, code: string) {
    return createEmployee(context, {
      person: { firstName: "Aster", lastName: "Mekonnen" },
      employee: {
        branchId,
        departmentId,
        positionId,
        employeeCode: code,
        employmentType: "permanent" as const,
        hireDate: "2026-01-01",
      },
    });
  }

  it("keeps the department a position was created under", async () => {
    const position = await createPosition(context, {
      title: "Backend Engineer",
      description: null,
      departmentId: softwareId,
    });
    expect(position?.departmentId).toBe(softwareId);
  });

  it("assigns a position together with its own department", async () => {
    const position = await createPosition(context, {
      title: "Backend Engineer",
      description: null,
      departmentId: softwareId,
    });
    const created = await employeeWith(position!.id, softwareId, "EMP-1");
    expect(created.employee.positionId).toBe(position!.id);
    expect(created.employee.departmentId).toBe(softwareId);
  });

  it("refuses a position under a different department", async () => {
    const position = await createPosition(context, {
      title: "Backend Engineer",
      description: null,
      departmentId: softwareId,
    });
    await expect(employeeWith(position!.id, financeId, "EMP-2")).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
    await expect(employeeWith(position!.id, null, "EMP-3")).rejects.toMatchObject({
      code: "BAD_REQUEST",
    });
  });

  it("lets a position without a department go anywhere", async () => {
    const position = await createPosition(context, {
      title: "Office Assistant",
      description: null,
    });
    const created = await employeeWith(position!.id, financeId, "EMP-4");
    expect(created.employee.positionId).toBe(position!.id);
  });

  it("holds the same line on an employment transition", async () => {
    const engineer = await createPosition(context, {
      title: "Backend Engineer",
      description: null,
      departmentId: softwareId,
    });
    const created = await employeeWith(engineer!.id, softwareId, "EMP-5");
    await expect(
      transitionEmployment(context, {
        employeeId: created.employee.id,
        branchId,
        departmentId: financeId,
        positionId: engineer!.id,
        employmentType: "permanent",
        status: "active",
        effectiveFrom: "2026-02-01",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
