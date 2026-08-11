import { beforeEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import { branches, roles, user, userRoles } from "@UnifiedAttendance/db/schema/index";

import {
  archiveRole,
  assignRole,
  createRole,
  listRoles,
  updateRole,
} from "../../../src/modules/access/service";
import { listEmployees, createEmployee } from "../../../src/modules/workforce/employees";
import { resetDatabase, testContext } from "../../fixtures";

const root = testContext("root");

describe("custom roles", () => {
  let branchId: string;

  beforeEach(async () => {
    await resetDatabase();
    await db.insert(user).values([
      { id: "root", name: "Root", email: "root@example.test", emailVerified: true },
      { id: "viewer", name: "Viewer", email: "viewer@example.test", emailVerified: true },
    ]);
    const [superRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, "Super Administrator"))
      .limit(1);
    await db.insert(userRoles).values({ userId: "root", roleId: superRole!.id });
    const [branch] = await db
      .insert(branches)
      .values({ name: "Head Office", code: "HQ" })
      .returning();
    branchId = branch!.id;
  });

  it("a custom role grants exactly what it was given", async () => {
    const role = await createRole(root, {
      name: "Directory Viewer",
      code: "DIRECTORY_VIEWER",
      description: "Sees the employee directory, changes nothing.",
      permissionCodes: ["employees.read"],
    });
    await assignRole(root, { userId: "viewer", roleId: role.id });

    const viewer = testContext("viewer");
    await expect(listEmployees(viewer, { branchId })).resolves.toEqual([]);
    await expect(
      createEmployee(viewer, {
        person: { firstName: "Aster", lastName: "Mekonnen" },
        employee: { branchId, employmentType: "permanent", hireDate: "2026-01-01" },
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("lists custom roles alongside protected system roles", async () => {
    await createRole(root, {
      name: "Directory Viewer",
      code: "DIRECTORY_VIEWER",
      permissionCodes: ["employees.read"],
    });
    const all = await listRoles(root);
    const custom = all.find((role) => role.code === "DIRECTORY_VIEWER");
    expect(custom).toMatchObject({ isSystem: false, permissionCount: 1, userCount: 0 });
    expect(all.find((role) => role.name === "Super Administrator")?.isSystem).toBe(true);
  });

  it("refuses to rename or archive system roles", async () => {
    const [hr] = await db.select().from(roles).where(eq(roles.name, "HR")).limit(1);
    await expect(updateRole(root, { roleId: hr!.id, name: "People Ops" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
    await expect(archiveRole(root, { roleId: hr!.id })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("refuses to archive a role people still hold", async () => {
    const role = await createRole(root, {
      name: "Directory Viewer",
      code: "DIRECTORY_VIEWER",
      permissionCodes: ["employees.read"],
    });
    await assignRole(root, { userId: "viewer", roleId: role.id });
    await expect(archiveRole(root, { roleId: role.id })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("frees a role's name and code once it is archived", async () => {
    const first = await createRole(root, {
      name: "Directory Viewer",
      code: "DIRECTORY_VIEWER",
      permissionCodes: ["employees.read"],
    });
    // While the first role lives, its name and code are taken.
    await expect(
      createRole(root, {
        name: "Directory Viewer",
        code: "DIRECTORY_VIEWER",
        permissionCodes: ["employees.read"],
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });

    await archiveRole(root, { roleId: first.id });

    const reborn = await createRole(root, {
      name: "Directory Viewer",
      code: "DIRECTORY_VIEWER",
      permissionCodes: ["employees.read"],
    });
    expect(reborn.id).not.toBe(first.id);
  });
});
