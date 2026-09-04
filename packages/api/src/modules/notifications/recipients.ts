import { eq } from "drizzle-orm";

import { roles, user, userRoles } from "@UnifiedAttendance/db/schema/index";

import { ROLES } from "../../rbac/permissions";

import type { Context } from "../../context";

export async function loadHrEmails(ctx: Context): Promise<string[]> {
  const rows = await ctx.db
    .select({ email: user.email })
    .from(userRoles)
    .innerJoin(roles, eq(userRoles.roleId, roles.id))
    .innerJoin(user, eq(user.id, userRoles.userId))
    .where(eq(roles.name, ROLES.hr));
  return rows.map((row) => row.email).filter((email): email is string => Boolean(email));
}

export function formatEmployeeName(
  firstName: string,
  middleName: string | null,
  lastName: string,
): string {
  return [firstName, middleName, lastName]
    .filter((part): part is string => Boolean(part))
    .join(" ");
}

export function resolveNotificationRecipients(
  hrEmails: readonly string[],
  employeeEmail: string | null,
): Set<string> {
  const recipients = new Set(hrEmails);
  if (employeeEmail) recipients.add(employeeEmail);
  return recipients;
}
