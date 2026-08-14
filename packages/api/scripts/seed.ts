import { fileURLToPath } from "node:url";

import { db } from "@UnifiedAttendance/db";
import { permissions, rolePermissions, roles } from "@UnifiedAttendance/db/schema/index";
import { and, inArray, notInArray, eq } from "drizzle-orm";

import { PERMISSIONS, ROLE_PERMISSIONS, ROLES } from "../src/rbac/permissions";

const SYSTEM_ROLES: Record<string, { code: string; description: string }> = {
  [ROLES.superAdministrator]: {
    code: "SUPER_ADMINISTRATOR",
    description: "Full platform access, including users and roles.",
  },
  [ROLES.admin]: { code: "ADMIN", description: "Full operational access." },
  [ROLES.manager]: {
    code: "MANAGER",
    description: "Runs clients, leads, contracts and invoices, and hires.",
  },
  [ROLES.hr]: { code: "HR", description: "Workforce, attendance and reports." },
};

export async function seedRbac() {
  await db.transaction(async (tx) => {
    for (const code of PERMISSIONS) {
      await tx.insert(permissions).values({ code }).onConflictDoNothing();
    }

    await tx.delete(permissions).where(notInArray(permissions.code, [...PERMISSIONS]));

    for (const [name, meta] of Object.entries(SYSTEM_ROLES)) {
      await tx.insert(roles).values({ name, ...meta, isSystem: true }).onConflictDoNothing();
      await tx.update(roles).set({ ...meta, isSystem: true }).where(eq(roles.name, name));
    }

    const roleId = new Map(
      (
        await tx
          .select({ id: roles.id, name: roles.name })
          .from(roles)
          .where(inArray(roles.name, Object.keys(SYSTEM_ROLES)))
      ).map((role) => [role.name, role.id]),
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
      // The seed states each system role in full: grants the code no longer
      // lists were revoked, and must not survive a re-seed.
      await tx.delete(rolePermissions).where(
        and(
          eq(rolePermissions.roleId, id),
          notInArray(
            rolePermissions.permissionId,
            grants.map((grant) => grant.permissionId),
          ),
        ),
      );
    }
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  await seedRbac();
  console.log("RBAC seeded: permissions, roles, and role permissions.");
}
