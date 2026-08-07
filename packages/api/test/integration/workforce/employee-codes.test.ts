import { beforeEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import {
  branches,
  organizations,
  roles,
  user,
  userRoles,
} from "@UnifiedAttendance/db/schema/index";

import { createDepartment, createEmployee } from "../../../src/modules/workforce/service";
import { resetDatabase, testContext } from "../../fixtures";

const context = testContext("admin");

describe("generated employee IDs", () => {
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
    await db.insert(organizations).values({ name: "Digital Construct", code: "DCG" });
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

  function hire(departmentId: string | null, employeeCode?: string) {
    return createEmployee(context, {
      person: { firstName: "Aster", lastName: "Mekonnen" },
      employee: {
        branchId,
        departmentId,
        employeeCode,
        employmentType: "permanent" as const,
        hireDate: "2026-01-01",
      },
    });
  }

  it("reads the ID off the organization, branch and department", async () => {
    const first = await hire(softwareId);
    expect(first.employee.employeeCode).toBe("DCG-HQ-SOF-0001");
  });

  it("numbers each department on its own", async () => {
    await hire(softwareId);
    const second = await hire(softwareId);
    const finance = await hire(financeId);
    expect(second.employee.employeeCode).toBe("DCG-HQ-SOF-0002");
    expect(finance.employee.employeeCode).toBe("DCG-HQ-FIN-0001");
  });

  it("skips the department segment when there is none", async () => {
    await hire(softwareId);
    const unassigned = await hire(null);
    expect(unassigned.employee.employeeCode).toBe("DCG-HQ-0001");
  });

  it("still honors a hand-written ID, once", async () => {
    const manual = await hire(softwareId, "EMP-1042");
    expect(manual.employee.employeeCode).toBe("EMP-1042");
    await expect(hire(financeId, "EMP-1042")).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
