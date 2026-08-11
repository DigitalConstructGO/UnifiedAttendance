import { beforeEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import { account, roles, user, userRoles } from "@UnifiedAttendance/db/schema/index";

import { createUser, listRoleGrants, listUsers } from "../../../src/modules/access/service";
import { resetDatabase, testContext } from "../../fixtures";

const context = testContext("root");

async function roleId(name: string) {
  const [role] = await db.select().from(roles).where(eq(roles.name, name)).limit(1);
  return role!.id;
}

describe("user management", () => {
  beforeEach(async () => {
    await resetDatabase();
    await db.insert(user).values({
      id: "root",
      name: "Root",
      email: "root@example.test",
      emailVerified: true,
    });
    await db.insert(userRoles).values({
      userId: "root",
      roleId: await roleId("Super Administrator"),
    });
  });

  it("creates a user that carries a role and a credential account", async () => {
    const created = await createUser(context, {
      name: "Hana HR",
      email: "hana@example.test",
      password: "changeme123",
      roleId: await roleId("HR"),
    });

    expect(created.roleName).toBe("HR");

    const users = await listUsers(context);
    const hana = users.find((row) => row.email === "hana@example.test");
    expect(hana?.roleName).toBe("HR");
    expect(hana?.name).toBe("Hana HR");

    // The credential row is what lets the person actually sign in.
    const credentials = await db.select().from(account).where(eq(account.userId, created.id));
    expect(credentials).toHaveLength(1);
    expect(credentials[0]!.providerId).toBe("credential");
    expect(credentials[0]!.password).toBeTruthy();
  });

  it("refuses a second user with the same email", async () => {
    const hr = await roleId("HR");
    const input = {
      name: "Hana HR",
      email: "hana@example.test",
      password: "changeme123",
      roleId: hr,
    };
    await createUser(context, input);
    await expect(createUser(context, { ...input, name: "Someone Else" })).rejects.toMatchObject({
      code: "CONFLICT",
    });
  });

  it("refuses callers who are not Super Administrators", async () => {
    await db.insert(user).values({
      id: "plain-admin",
      name: "Plain Admin",
      email: "plain@example.test",
      emailVerified: true,
    });
    await db.insert(userRoles).values({
      userId: "plain-admin",
      roleId: await roleId("Admin"),
    });

    await expect(
      createUser(testContext("plain-admin"), {
        name: "New Person",
        email: "new@example.test",
        password: "changeme123",
        roleId: await roleId("HR"),
      }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("reports every role's grants for the permissions editor", async () => {
    const grants = await listRoleGrants(context);
    const hr = await roleId("HR");
    const hrGrants = grants.filter((grant) => grant.roleId === hr).map((g) => g.permissionCode);
    expect(hrGrants).toContain("employees.create");
    expect(hrGrants).not.toContain("organization.update");
  });
});
