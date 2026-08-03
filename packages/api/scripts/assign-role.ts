import { db } from "@UnifiedAttendance/db";
import { user } from "@UnifiedAttendance/db/schema/auth";
import { roles, userRoles } from "@UnifiedAttendance/db/schema/index";
import { auth } from "@UnifiedAttendance/auth";
import { eq } from "drizzle-orm";

import { ROLES, isRole } from "../src/rbac/permissions";
import { seedRbac } from "./seed";

const email = process.argv[2];
const roleName = process.argv[3];
const password = process.argv[4] ?? "changeme123";
const name = process.argv[5] ?? (email ? email.split("@")[0] : "User");

if (!email || !roleName) {
  console.error("Usage: tsx scripts/assign-role.ts <email> <roleName> [password] [name]");
  console.error(`  Roles: ${Object.values(ROLES).join(", ")}`);
  process.exit(1);
}

if (!isRole(roleName)) {
  console.error(`Unknown role "${roleName}". Must be one of: ${Object.values(ROLES).join(", ")}`);
  process.exit(1);
}

await seedRbac();

const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email!));
const userId =
  existing?.id ??
  (await auth.api.signUpEmail({ body: { email: email!, password, name: name ?? "User" } })).user
    .id;

// Trust the operator running this script — mark email as verified.
await db.update(user).set({ emailVerified: true }).where(eq(user.id, userId));

const [role] = await db.select({ id: roles.id }).from(roles).where(eq(roles.name, roleName));
if (!role) throw new Error(`Role "${roleName}" was not seeded`);

await db
  .insert(userRoles)
  .values({ userId, roleId: role.id })
  .onConflictDoUpdate({ target: userRoles.userId, set: { roleId: role.id } });

console.log(
  `${existing ? "Found" : "Created"} ${email} and assigned "${roleName}" (password: ${existing ? "(unchanged)" : password})`,
);
