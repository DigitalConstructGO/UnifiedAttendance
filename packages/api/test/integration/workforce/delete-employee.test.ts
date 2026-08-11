import { beforeEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import {
  branches,
  branchWorkingDays,
  clients,
  clientTypes,
  industries,
  manualAttendanceEntries,
  organizations,
  roles,
  user,
  userRoles,
} from "@UnifiedAttendance/db/schema/index";

import { createManualAttendanceEntry } from "../../../src/modules/attendance/service";
import {
  archiveEmployee,
  createEmployee,
  deleteEmployee,
  listEmployees,
  restoreEmployee,
} from "../../../src/modules/workforce/employees";
import { createManualAttendanceEntryInput } from "../../../src/validations/attendance";
import { resetDatabase, testContext } from "../../fixtures";

const admin = testContext("admin");
const CONFLICT = { code: "CONFLICT" };

describe("archiving and deleting employees", () => {
  let branchId: string;

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
      .values({ name: "Head Office", code: "HQ", timezone: "Africa/Addis_Ababa" })
      .returning();
    branchId = branch!.id;
    await db.insert(branchWorkingDays).values({
      branchId,
      weekday: 0,
      isWorkingDay: true,
      openingTime: "09:00",
      closingTime: "17:00",
    });
  });

  async function seedEmployee() {
    const created = await createEmployee(admin, {
      person: { firstName: "Hanna", lastName: "Girma" },
      employee: { branchId, employmentType: "permanent", hireDate: "2026-01-05" },
    });
    return created.employee.id;
  }

  it("archiving hides the employee from the directory, restoring brings them back", async () => {
    const employeeId = await seedEmployee();

    await archiveEmployee(admin, { id: employeeId });
    expect(await listEmployees(admin, { branchId })).toHaveLength(0);
    expect(await listEmployees(admin, { branchId, archived: true })).toHaveLength(1);

    await restoreEmployee(admin, { id: employeeId });
    expect(await listEmployees(admin, { branchId })).toHaveLength(1);
    expect(await listEmployees(admin, { branchId, archived: true })).toHaveLength(0);
  });

  it("refuses to delete for good before the employee is archived", async () => {
    const employeeId = await seedEmployee();
    await expect(deleteEmployee(admin, { id: employeeId })).rejects.toMatchObject(CONFLICT);
  });

  it("deleting from the archive removes the employee and their attendance trail", async () => {
    const employeeId = await seedEmployee();
    await createManualAttendanceEntry(
      admin,
      createManualAttendanceEntryInput.parse({
        employeeId,
        attendanceDate: "2026-02-09",
        kind: "check_in",
        occurredAt: "2026-02-09T09:00:00+03:00",
      }),
    );
    await archiveEmployee(admin, { id: employeeId });

    const deleted = await deleteEmployee(admin, { id: employeeId });
    expect(deleted?.id).toBe(employeeId);

    const entries = await db
      .select()
      .from(manualAttendanceEntries)
      .where(eq(manualAttendanceEntries.employeeId, employeeId));
    expect(entries).toHaveLength(0);
  });

  it("still refuses while the employee owns a client", async () => {
    const employeeId = await seedEmployee();
    const [organization] = await db
      .insert(organizations)
      .values({ name: "Digital Construct", code: "DC" })
      .returning();
    const [industry] = await db
      .insert(industries)
      .values({ organizationId: organization!.id, name: "Construction" })
      .returning();
    const [clientType] = await db
      .insert(clientTypes)
      .values({ organizationId: organization!.id, name: "Private" })
      .returning();
    await db.insert(clients).values({
      organizationId: organization!.id,
      branchId,
      ownerEmployeeId: employeeId,
      clientCode: "CL-1",
      legalName: "Handled Trading",
      industryId: industry!.id,
      clientTypeId: clientType!.id,
      relationshipStartedOn: "2026-01-01",
    });
    await archiveEmployee(admin, { id: employeeId });

    await expect(deleteEmployee(admin, { id: employeeId })).rejects.toMatchObject(CONFLICT);
  });
});
