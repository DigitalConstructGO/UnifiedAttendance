import { db } from "@UnifiedAttendance/db";
import { permissions, rolePermissions, roles } from "@UnifiedAttendance/db/schema/index";
import { and, eq } from "drizzle-orm";

import { ROLE_PERMISSIONS, isRole } from "../src/rbac/permissions";
import { seedRbac } from "./seed";

/**
 * Re-syncs the DB role_permissions to match the code-defined ROLE_PERMISSIONS.
 * Deletes grants that are no longer in code, adds any that are missing.
 */
await seedRbac();

for (const [roleName, expectedCodes] of Object.entries(ROLE_PERMISSIONS)) {
  if (!isRole(roleName)) continue;

  const [role] = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, roleName));
  if (!role) continue;

  // Current grants in DB for this role
  const current = await db
    .select({ code: permissions.code, permissionId: permissions.id })
    .from(rolePermissions)
    .innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
    .where(eq(rolePermissions.roleId, role.id));

  const expectedSet = new Set(expectedCodes);
  const currentSet = new Set(current.map((c) => c.code));

  // Delete grants not in code
  for (const row of current) {
    if (!expectedSet.has(row.code as any)) {
      await db
        .delete(rolePermissions)
        .where(
          and(eq(rolePermissions.roleId, role.id), eq(rolePermissions.permissionId, row.permissionId)),
        );
      console.log(`  - Removed "${row.code}" from ${roleName}`);
    }
  }

  // Add grants missing from DB
  for (const code of expectedCodes) {
    if (!currentSet.has(code)) {
      const [perm] = await db
        .select({ id: permissions.id })
        .from(permissions)
        .where(eq(permissions.code, code));
      if (perm) {
        await db.insert(rolePermissions).values({ roleId: role.id, permissionId: perm.id });
        console.log(`  + Added "${code}" to ${roleName}`);
      }
    }
  }
}

console.log("Done — role permissions synced to code.");
