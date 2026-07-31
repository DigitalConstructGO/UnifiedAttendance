import { beforeEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import { branches, roles, user, userRoles } from "@UnifiedAttendance/db/schema/index";

import {
  createEmployee,
  createEmploymentContract,
  deleteCosigner,
  listEmploymentContracts,
  transitionEmployment,
  updateEmploymentContract,
} from "../../../src/modules/workforce/service";
import { resetDatabase, testContext } from "../../fixtures";

const context = testContext("admin");

describe("employment contracts", () => {
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

  it("keeps the employee, dated assignment, signature, and cosigner on one contract", async () => {
    const createdEmployee = await createEmployee(context, {
      person: { firstName: "Aster", lastName: "Mekonnen" },
      employee: {
        branchId: firstBranchId,
        employeeCode: "EMP-100",
        employmentType: "permanent",
        hireDate: "2026-01-01",
      },
    });
    const secondPeriod = await transitionEmployment(context, {
      employeeId: createdEmployee.employee.id,
      branchId: secondBranchId,
      employmentType: "contract",
      effectiveFrom: "2026-02-01",
      status: "active",
    });
    const createdContract = await createEmploymentContract(context, {
      employeeId: createdEmployee.employee.id,
      contractNumber: "CON-2026-001",
      cosigner: {
        fullName: "Bekele Tadesse",
        phone: "+251911000000",
        workplace: "Abyssinia Bank",
      },
      startsOn: "2026-02-05",
      status: "signed",
      signedOn: "2026-02-03",
      notes: "Fixed-term assignment",
    });

    expect(createdContract).toMatchObject({
      employee: { id: createdEmployee.employee.id, employeeCode: "EMP-100" },
      person: { firstName: "Aster", lastName: "Mekonnen" },
      period: { id: secondPeriod!.id, branchId: secondBranchId, employmentType: "contract" },
      cosigner: { fullName: "Bekele Tadesse" },
      contract: {
        contractNumber: "CON-2026-001",
        status: "signed",
        signedOn: "2026-02-03",
      },
    });

    const updatedContract = await updateEmploymentContract(context, {
      id: createdContract.contract.id,
      endsOn: "2026-12-31",
      status: "ended",
    });
    expect(updatedContract.contract).toMatchObject({
      status: "ended",
      signedOn: "2026-02-03",
      endsOn: "2026-12-31",
    });

    const employeeContracts = await listEmploymentContracts(context, {
      employeeId: createdEmployee.employee.id,
    });
    expect(employeeContracts).toHaveLength(1);
    expect(employeeContracts[0]?.contract.id).toBe(createdContract.contract.id);

    await expect(
      deleteCosigner(context, { id: createdContract.cosigner.id }),
    ).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("rejects a contract date that is outside the employee's employment history", async () => {
    const createdEmployee = await createEmployee(context, {
      person: { firstName: "Hanna", lastName: "Girma" },
      employee: {
        branchId: firstBranchId,
        employeeCode: "EMP-101",
        employmentType: "permanent",
        hireDate: "2026-03-01",
      },
    });

    await expect(
      createEmploymentContract(context, {
        employeeId: createdEmployee.employee.id,
        contractNumber: "CON-2026-002",
        cosigner: { fullName: "Rahel Solomon" },
        startsOn: "2026-02-28",
        status: "draft",
      }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
