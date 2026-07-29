import type { Permission } from "@UnifiedAttendance/api/rbac/permissions";

import { createInnerContext } from "@UnifiedAttendance/api/context";
import { getMyAccess } from "@UnifiedAttendance/api";
import { auth } from "@UnifiedAttendance/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { can, toAccess, type Access } from "./access";

/**
 * Resolves the signed-in user and what they may do, for a Server Component. The
 * middleware has already bounced anonymous requests, but it only saw a cookie —
 * this is where the session is actually verified.
 *
 * Cached per request, so a layout and the page inside it share one lookup.
 */
export const loadAccess = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const rows = await getMyAccess(createInnerContext({ session }));
  return { session, access: toAccess(rows) };
});

/** Same, but a user without the permission never reaches the page. */
export async function requireAccess(permission: Permission) {
  const loaded = await loadAccess();
  if (!can(loaded.access, permission)) redirect("/no-access");
  return loaded;
}

export type { Access };
