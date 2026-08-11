import { beforeEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import { branches, roles, user, userRoles } from "@UnifiedAttendance/db/schema/index";

import { createClient } from "../../../src/modules/clients/clients";
import { createOpportunity } from "../../../src/modules/clients/opportunities";
import { createEmployee, updateEmployee } from "../../../src/modules/workforce/employees";
import { resetDatabase, testContext } from "../../fixtures";

const manager = testContext("manager");
const admin = testContext("admin");

const FORBIDDEN = { code: "FORBIDDEN" };

describe("a Manager is read-only", () => {
  let branchId: string;

  beforeEach(async () => {
    await resetDatabase();
    await db.insert(user).values([
      { id: "manager", name: "Manager", email: "manager@example.test", emailVerified: true },
      { id: "admin", name: "Admin", email: "admin@example.test", emailVerified: true },
    ]);
    const [managerRole] = await db.select().from(roles).where(eq(roles.name, "Manager")).limit(1);
    const [adminRole] = await db.select().from(roles).where(eq(roles.name, "Admin")).limit(1);
    await db.insert(userRoles).values([
      { userId: "manager", roleId: managerRole!.id },
      { userId: "admin", roleId: adminRole!.id },
    ]);
    const [branch] = await db
      .insert(branches)
      .values({ name: "Head Office", code: "HQ" })
      .returning();
    branchId = branch!.id;
  });

  it("cannot create an employee", async () => {
    await expect(
      createEmployee(manager, {
        person: { firstName: "Aster", lastName: "Mekonnen" },
        employee: { branchId, employmentType: "permanent", hireDate: "2026-01-01" },
      }),
    ).rejects.toMatchObject(FORBIDDEN);
  });

  it("cannot update an employee someone else created", async () => {
    const created = await createEmployee(admin, {
      person: { firstName: "Aster", lastName: "Mekonnen" },
      employee: { branchId, employmentType: "permanent", hireDate: "2026-01-01" },
    });
    await expect(
      updateEmployee(manager, {
        id: created.employee.id,
        person: { firstName: "Renamed" },
      }),
    ).rejects.toMatchObject(FORBIDDEN);
  });

  it("cannot create a client", async () => {
    await expect(
      createClient(manager, {
        branchId,
        ownerEmployeeId: "00000000-0000-0000-0000-000000000000",
        legalName: "Forbidden Trading",
        industryId: "00000000-0000-0000-0000-000000000000",
        clientTypeId: "00000000-0000-0000-0000-000000000000",
        relationshipStartedOn: "2026-01-01",
      }),
    ).rejects.toMatchObject(FORBIDDEN);
  });

  it("cannot create a lead", async () => {
    await expect(
      createOpportunity(manager, {
        branchId,
        name: "Forbidden Lead",
        ownerEmployeeId: "00000000-0000-0000-0000-000000000000",
        pipelineStageId: "00000000-0000-0000-0000-000000000000",
      }),
    ).rejects.toMatchObject(FORBIDDEN);
  });
});
