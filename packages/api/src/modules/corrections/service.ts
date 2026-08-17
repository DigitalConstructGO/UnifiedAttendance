import { desc, eq } from "drizzle-orm";

import { attendanceCorrections, attendanceEvents } from "@UnifiedAttendance/db/schema/index";
import { user } from "@UnifiedAttendance/db/schema/auth";

import { badRequest, notFound } from "../../errors";
import { withTransaction } from "../../context";
import { assertAttendanceDayEditable } from "../../attendance/edit-lock";
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
  await assertAttendanceDayEditable(ctx, { branchId, attendanceDate: input.attendanceDate });
  if (input.disputedEventId) {
    const [event] = await ctx.db
      .select()
      .from(attendanceEvents)
      .where(eq(attendanceEvents.id, input.disputedEventId))
      .limit(1);
    if (!event || event.employeeId !== input.employeeId)
      badRequest("Disputed event must belong to the employee");
  }
  return withTransaction(ctx, async (ctx) => {
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
  });
}

export async function updateCorrection(ctx: Context, input: UpdateCorrectionInput) {
  const [current] = await ctx.db
    .select()
    .from(attendanceCorrections)
    .where(eq(attendanceCorrections.id, input.id))
    .limit(1);
  if (!current) notFound("Correction");
  const branchId = await employeeBranchOrThrow(ctx, current.employeeId);
  await requirePermission(ctx, "corrections.update", branchId);
  await assertAttendanceDayEditable(ctx, { branchId, attendanceDate: current.attendanceDate });

  const nextEmployeeId = input.values.employeeId ?? current.employeeId;
  const nextAttendanceDate = input.values.attendanceDate ?? current.attendanceDate;
  if (nextEmployeeId !== current.employeeId || nextAttendanceDate !== current.attendanceDate) {
    const nextBranchId = await employeeBranchOrThrow(ctx, nextEmployeeId);
    await assertAttendanceDayEditable(ctx, {
      branchId: nextBranchId,
      attendanceDate: nextAttendanceDate,
    });
  }

  return withTransaction(ctx, async (ctx) => {
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
  });
}

export async function deleteCorrection(ctx: Context, input: DeleteCorrectionInput) {
  const [current] = await ctx.db
    .select()
    .from(attendanceCorrections)
    .where(eq(attendanceCorrections.id, input.id))
    .limit(1);
  if (!current) notFound("Correction");
  const branchId = await employeeBranchOrThrow(ctx, current.employeeId);
  await requirePermission(ctx, "corrections.delete", branchId);
  await assertAttendanceDayEditable(ctx, { branchId, attendanceDate: current.attendanceDate });
  await withTransaction(ctx, async (ctx) => {
    await ctx.db.delete(attendanceCorrections).where(eq(attendanceCorrections.id, input.id));
    await deriveAttendanceDay(ctx, {
      employeeId: current.employeeId,
      attendanceDate: current.attendanceDate,
    });
  });
  return current;
}
