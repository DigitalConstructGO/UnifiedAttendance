import { desc, eq } from "drizzle-orm";

import { attendanceCorrections, attendanceEvents } from "@UnifiedAttendance/db/schema/index";
import { user } from "@UnifiedAttendance/db/schema/auth";

import { badRequest, notFound } from "../../errors";
import { deriveAttendanceDay } from "../../attendance/derive-day";
import { employeeBranchOrThrow, requirePermission, requireSessionUser } from "../shared/guards";

import type {
  CreateCorrectionInput,
  DeleteCorrectionInput,
  ListCorrectionsInput,
  UpdateCorrectionInput,
} from "../../validations/corrections";
import type { Context } from "../../context";

export async function listCorrections(ctx: Context, input: ListCorrectionsInput) {
  await requirePermission(
    ctx,
    "corrections.read",
    await employeeBranchOrThrow(ctx, input.employeeId),
  );
  const rows = await ctx.db
    .select({ correction: attendanceCorrections, appliedByName: user.name })
    .from(attendanceCorrections)

    .innerJoin(user, eq(attendanceCorrections.appliedBy, user.id))
    .where(eq(attendanceCorrections.employeeId, input.employeeId))
    .orderBy(desc(attendanceCorrections.appliedAt));

  return rows.map(({ correction, appliedByName }) => ({ ...correction, appliedByName }));
}

export async function createCorrection(ctx: Context, input: CreateCorrectionInput) {
  const branchId = await employeeBranchOrThrow(ctx, input.employeeId);
  await requirePermission(ctx, "corrections.create", branchId);
  if (input.disputedEventId) {
    const [event] = await ctx.db
      .select()
      .from(attendanceEvents)
      .where(eq(attendanceEvents.id, input.disputedEventId))
      .limit(1);
    if (!event || event.employeeId !== input.employeeId)
      badRequest("Disputed event must belong to the employee");
  }
  const [correction] = await ctx.db
    .insert(attendanceCorrections)
    .values({
      ...input,
      disputedEventId: input.disputedEventId ?? null,
      proposedTime: input.proposedTime ?? null,
      appliedBy: requireSessionUser(ctx),
    })
    .returning();
  if (!correction) throw new Error("Failed to store the correction");
  await deriveAttendanceDay(ctx, {
    employeeId: correction.employeeId,
    attendanceDate: correction.attendanceDate,
  });
  return correction;
}

export async function updateCorrection(ctx: Context, input: UpdateCorrectionInput) {
  const [current] = await ctx.db
    .select()
    .from(attendanceCorrections)
    .where(eq(attendanceCorrections.id, input.id))
    .limit(1);
  if (!current) notFound("Correction");
  await requirePermission(
    ctx,
    "corrections.update",
    await employeeBranchOrThrow(ctx, current.employeeId),
  );
  const [correction] = await ctx.db
    .update(attendanceCorrections)
    .set(input.values)
    .where(eq(attendanceCorrections.id, input.id))
    .returning();
  if (!correction) throw new Error("Failed to update the correction");

  await deriveAttendanceDay(ctx, {
    employeeId: current.employeeId,
    attendanceDate: current.attendanceDate,
  });
  if (
    correction.employeeId !== current.employeeId ||
    correction.attendanceDate !== current.attendanceDate
  ) {
    await deriveAttendanceDay(ctx, {
      employeeId: correction.employeeId,
      attendanceDate: correction.attendanceDate,
    });
  }
  return correction;
}

export async function deleteCorrection(ctx: Context, input: DeleteCorrectionInput) {
  const [current] = await ctx.db
    .select()
    .from(attendanceCorrections)
    .where(eq(attendanceCorrections.id, input.id))
    .limit(1);
  if (!current) notFound("Correction");
  await requirePermission(
    ctx,
    "corrections.delete",
    await employeeBranchOrThrow(ctx, current.employeeId),
  );
  await ctx.db.delete(attendanceCorrections).where(eq(attendanceCorrections.id, input.id));
  await deriveAttendanceDay(ctx, {
    employeeId: current.employeeId,
    attendanceDate: current.attendanceDate,
  });
  return current;
}
