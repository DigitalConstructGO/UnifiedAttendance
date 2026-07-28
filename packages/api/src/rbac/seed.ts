import { fileURLToPath } from "node:url";

import { db } from "@UnifiedAttendance/db";
import { permissions, rolePermissions, roles } from "@UnifiedAttendance/db/schema/index";
import { eq, inArray } from "drizzle-orm";

import { FIXED_ROLES, PERMISSIONS } from "./permissions";

/** Seeds the catalog and fixed Roles; assign the first Super Administrator directly in the database. */

export async function seedRbac() {
  const permissionCodes = Object.values(PERMISSIONS);
  const roleNames = Object.values(FIXED_ROLES);

  await db.transaction(async (tx) => {
    for (const code of permissionCodes) {
      await tx.insert(permissions).values({ code }).onConflictDoNothing();
    }
    for (const name of roleNames) {
      await tx.insert(roles).values({ name }).onConflictDoNothing();
    }

    const [superAdministrator] = await tx
      .select()
      .from(roles)
      .where(eq(roles.name, FIXED_ROLES.superAdministrator));
    if (!superAdministrator) throw new Error("Super Administrator Role was not seeded");

    const seededPermissions = await tx
      .select({ id: permissions.id })
      .from(permissions)
      .where(inArray(permissions.code, permissionCodes));

    await tx.delete(rolePermissions).where(eq(rolePermissions.roleId, superAdministrator.id));
    await tx.insert(rolePermissions).values(
      seededPermissions.map((permission) => ({
        roleId: superAdministrator.id,
        permissionId: permission.id,
      })),
    );
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await seedRbac();
}
