import { eq } from "drizzle-orm";

import { branches } from "@UnifiedAttendance/db/schema/index";

import { forbidden, notFound } from "../errors";
import { isAdministrator } from "../modules/shared/guards";
import { localDayBounds } from "./day-expectation";

import type { Context } from "../context";

const EDIT_GRACE_MS = 24 * 60 * 60 * 1000;

export async function assertAttendanceDayEditable(
  ctx: Context,
  options: { branchId: string; attendanceDate: string },
) {
  if (await isAdministrator(ctx)) return;

  const [branch] = await ctx.db
    .select({ timezone: branches.timezone })
    .from(branches)
    .where(eq(branches.id, options.branchId))
    .limit(1);
  if (!branch) notFound("Branch");

  const { dayEnd } = localDayBounds(options.attendanceDate, branch.timezone);

  const lockedAt = dayEnd.getTime() + EDIT_GRACE_MS;
  if (Date.now() >= lockedAt) {
    forbidden(
      `${options.attendanceDate}'s attendance is locked — it can only be edited within 24 hours after the day ends.`,
    );
  }
}
