import { fileURLToPath } from "node:url";

import { db } from "@UnifiedAttendance/db";
import { permissions, rolePermissions, roles } from "@UnifiedAttendance/db/schema/index";

import { PERMISSIONS, ROLE_PERMISSIONS, ROLES } from "../src/rbac/permissions";

export async function seedRbac() {
  await db.transaction(async (tx) => {
    for (const code of Object.values(PERMISSIONS)) {
      await tx.insert(permissions).values({ code }).onConflictDoNothing();
    }
    for (const name of Object.values(ROLES)) {
      await tx.insert(roles).values({ name }).onConflictDoNothing();
    }

    const roleId = new Map(
      (await tx.select({ id: roles.id, name: roles.name }).from(roles)).map((role) => [
        role.name,
        role.id,
      ]),
    );
    const permissionId = new Map(
      (await tx.select({ id: permissions.id, code: permissions.code }).from(permissions)).map(
        (permission) => [permission.code, permission.id],
      ),
    );

    for (const [name, granted] of Object.entries(ROLE_PERMISSIONS)) {
      const id = roleId.get(name);
      if (!id) throw new Error(`Role ${name} was not seeded`);

      const grants = granted.map((code) => {
        const permission = permissionId.get(code);
        if (!permission) throw new Error(`Permission ${code} was not seeded`);
        return { roleId: id, permissionId: permission };
      });

      await tx.insert(rolePermissions).values(grants).onConflictDoNothing();
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await seedRbac();
}
