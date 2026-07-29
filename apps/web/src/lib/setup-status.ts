import { eq } from "drizzle-orm";

import { branchWorkingDays, branches, organizations } from "@UnifiedAttendance/db/schema/index";
import { db } from "@UnifiedAttendance/db";
import { cache } from "react";

export const getSetupStatus = cache(async () => {
  const [organization] = await db.select({ id: organizations.id }).from(organizations).limit(1);
  const [branch] = await db.select({ id: branches.id }).from(branches).orderBy(branches.createdAt).limit(1);
  const days = branch ? await db.select({ weekday: branchWorkingDays.weekday }).from(branchWorkingDays).where(eq(branchWorkingDays.branchId, branch.id)) : [];
  const scheduleComplete = new Set(days.map((day) => day.weekday)).size === 7;
  return { complete: Boolean(organization && branch && scheduleComplete), organizationExists: Boolean(organization), branchExists: Boolean(branch), scheduleComplete };
});
