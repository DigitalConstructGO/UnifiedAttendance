import { and, eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import { attendanceCorrections, attendanceEvents } from "@UnifiedAttendance/db/schema/index";

import { badRequest, conflict, forbidden, notFound } from "../../errors";
import { deriveAttendanceDay } from "../../attendance/derive-day";
import { employeeBranchOrThrow, requirePermission, requireSessionUser } from "../shared/guards";

import type {
  CreateCorrectionInput,
  ListCorrectionsInput,
  ReviewCorrectionInput,
  UpdateCorrectionInput,
} from "../../validations/corrections";
import type { Context } from "../../context";

export async function listCorrections(ctx: Context, input: ListCorrectionsInput) {
  await requirePermission(ctx, "corrections:read", await employeeBranchOrThrow(input.employeeId));
  return db
    .select()
    .from(attendanceCorrections)
    .where(
      and(
        eq(attendanceCorrections.employeeId, input.employeeId),
        input.status ? eq(attendanceCorrections.status, input.status) : undefined,
      ),
    );
}

export async function createCorrection(ctx: Context, input: CreateCorrectionInput) {
  const branchId = await employeeBranchOrThrow(input.employeeId);
  await requirePermission(ctx, "corrections:manage", branchId);
  if (input.disputedEventId) {
    const [event] = await db
      .select()
      .from(attendanceEvents)
      .where(eq(attendanceEvents.id, input.disputedEventId))
      .limit(1);
    if (!event || event.employeeId !== input.employeeId)
      badRequest("Disputed event must belong to the employee");
  }
  const [correction] = await db
    .insert(attendanceCorrections)
    .values({
      ...input,
      disputedEventId: input.disputedEventId ?? null,
      proposedTime: input.proposedTime ?? null,
      requestedBy: requireSessionUser(ctx),
    })
    .returning();
  return correction;
}

export async function updateCorrection(ctx: Context, input: UpdateCorrectionInput) {
  const [current] = await db
    .select()
    .from(attendanceCorrections)
    .where(eq(attendanceCorrections.id, input.id))
    .limit(1);
  if (!current) notFound("Correction");
  await requirePermission(
    ctx,
    "corrections:manage",
    await employeeBranchOrThrow(current.employeeId),
  );
  if (current.status !== "pending")
    conflict("Only pending corrections can be changed");
  if (current.requestedBy !== requireSessionUser(ctx))
    forbidden("Only the requester can change a correction");
  const [correction] = await db
    .update(attendanceCorrections)
    .set(input.values)
    .where(eq(attendanceCorrections.id, input.id))
    .returning();
  return correction;
}

export async function reviewCorrection(ctx: Context, input: ReviewCorrectionInput) {
  const [current] = await db
    .select()
    .from(attendanceCorrections)
    .where(eq(attendanceCorrections.id, input.id))
    .limit(1);
  if (!current) notFound("Correction");
  await requirePermission(
    ctx,
    "corrections:review",
    await employeeBranchOrThrow(current.employeeId),
  );
  const reviewer = requireSessionUser(ctx);
  if (current.requestedBy === reviewer) forbidden("A requester cannot review their own correction");
  if (current.status !== "pending")
    conflict("Correction has already been reviewed");
  const [correction] = await db
    .update(attendanceCorrections)
    .set({
      status: input.status,
      reviewNote: input.reviewNote ?? null,
      reviewedBy: reviewer,
      reviewedAt: new Date(),
    })
    .where(eq(attendanceCorrections.id, input.id))
    .returning();
  if (correction?.status === "approved") {
    await deriveAttendanceDay({
      employeeId: correction.employeeId,
      attendanceDate: correction.attendanceDate,
    });
  }
  return correction;
}
