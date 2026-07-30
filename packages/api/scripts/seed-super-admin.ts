import { fileURLToPath } from "node:url";

import { db } from "@UnifiedAttendance/db";
import { user } from "@UnifiedAttendance/db/schema/auth";
import { roles, userRoles } from "@UnifiedAttendance/db/schema/index";
import { auth } from "@UnifiedAttendance/auth";
import { eq } from "drizzle-orm";

import { ROLES } from "../src/rbac/permissions";
import { seedRbac } from "./seed";

/**
 * Creates the first Super Administrator.
 *
 * The account is created through better-auth rather than by raw insert: the password
 * column holds better-auth's own hash format, so a hand-written row produces a user
 * who can never sign in. The role and the verified flag are then written directly.
 */
export async function seedSuperAdmin({
  email,
  password,
  name,
}: {
  email: string;
  password: string;
  name: string;
}) {
  await seedRbac();

  const [existing] = await db.select({ id: user.id }).from(user).where(eq(user.email, email));
  const userId =
    existing?.id ??
    (await auth.api.signUpEmail({ body: { email, password, name } })).user.id;

  // Nothing sends verification mail yet, so trust the operator running this script.
  await db.update(user).set({ emailVerified: true }).where(eq(user.id, userId));

  const [role] = await db
    .select({ id: roles.id })
    .from(roles)
    .where(eq(roles.name, ROLES.superAdministrator));
  if (!role) throw new Error("Super Administrator role was not seeded");

  await db
    .insert(userRoles)
    .values({ userId, roleId: role.id })
    .onConflictDoUpdate({ target: userRoles.userId, set: { roleId: role.id } });

  return { userId, email, created: !existing };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const email = process.env.SUPER_ADMIN_EMAIL ?? process.argv[2];
  const password = process.env.SUPER_ADMIN_PASSWORD ?? process.argv[3];
  const name = process.env.SUPER_ADMIN_NAME ?? process.argv[4] ?? "Super Administrator";

  if (!email || !password) {
    throw new Error(
      "Usage: pnpm rbac:seed-admin <email> <password> [name]  (or set SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD)",
    );
  }

  const result = await seedSuperAdmin({ email, password, name });
  console.log(
    `${result.created ? "Created" : "Found"} ${result.email} and assigned Super Administrator`,
  );
}
