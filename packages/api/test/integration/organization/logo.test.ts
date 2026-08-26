import { beforeEach, describe, expect, it } from "vitest";

import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import { organizations, roles, user, userRoles } from "@UnifiedAttendance/db/schema/index";

import { ApiError } from "../../../src/errors";
import {
  authorizeOrganizationLogoUpload,
  updateOrganization,
} from "../../../src/modules/organization/service";
import { resetDatabase, testContext } from "../../fixtures";

async function seedUser(id: string, roleName: string) {
  await db.insert(user).values({ id, name: id, email: `${id}@example.test`, emailVerified: true });
  const [role] = await db.select().from(roles).where(eq(roles.name, roleName)).limit(1);
  await db.insert(userRoles).values({ userId: id, roleId: role!.id });
}

describe("organization logo", () => {
  let organizationId: string;

  beforeEach(async () => {
    await resetDatabase();
    await seedUser("admin", "Admin");
    await seedUser("viewer", "Manager");
    const [organization] = await db
      .insert(organizations)
      .values({ name: "Example Company", code: "EX" })
      .returning();
    organizationId = organization!.id;
  });

  it("hands an admin a fixed storage key for the organization's logo", async () => {
    const result = await authorizeOrganizationLogoUpload(testContext("admin"), {
      id: organizationId,
      contentType: "image/png",
      contentLength: 1024,
    });
    expect(result).toEqual({
      storageKey: `organization/${organizationId}/logo`,
      contentType: "image/png",
    });
  });

  it("refuses users without organization.update", async () => {
    await expect(
      authorizeOrganizationLogoUpload(testContext("viewer"), {
        id: organizationId,
        contentType: "image/png",
        contentLength: 1024,
      }),
    ).rejects.toMatchObject({ status: 403 } satisfies Partial<ApiError>);
  });

  it("404s for an organization that does not exist", async () => {
    await expect(
      authorizeOrganizationLogoUpload(testContext("admin"), {
        id: "00000000-0000-4000-8000-000000000000",
        contentType: "image/png",
        contentLength: 1024,
      }),
    ).rejects.toMatchObject({ status: 404 });
  });

  it("stores and clears the logo URL through the ordinary update", async () => {
    const url = "https://res.cloudinary.com/demo/image/upload/v1/organization/x/logo.png";
    const updated = await updateOrganization(testContext("admin"), {
      id: organizationId,
      logoUrl: url,
    });
    expect(updated?.logoUrl).toBe(url);
    const cleared = await updateOrganization(testContext("admin"), {
      id: organizationId,
      logoUrl: null,
    });
    expect(cleared?.logoUrl).toBeNull();
  });
});
