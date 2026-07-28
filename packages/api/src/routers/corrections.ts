import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { db } from "@UnifiedAttendance/db";
import { attendanceCorrections, attendanceEvents } from "@UnifiedAttendance/db/schema/index";

import { protectedProcedure, router } from "../index";
import { employeeBranchOrThrow, notFound, requirePermission, requireSessionUser } from "./shared";

const id = z.uuid();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const correctionType = z.enum(["add_check_in", "add_check_out", "adjust_check_in", "adjust_check_out", "mark_absent", "mark_present", "excuse_lateness"]);

const correctionValues = z.object({
  employeeId: id,
  attendanceDate: date,
  type: correctionType,
  disputedEventId: id.nullable().optional(),
  proposedTime: z.coerce.date().nullable().optional(),
  reason: z.string().trim().min(1),
});

const createCorrectionInput = correctionValues.superRefine((input, issue) => {
  if (["add_check_in", "add_check_out", "adjust_check_in", "adjust_check_out"].includes(input.type) && !input.proposedTime) {
    issue.addIssue({ code: "custom", path: ["proposedTime"], message: "A proposed time is required for this correction type" });
  }
});

export const correctionsRouter = router({
  list: protectedProcedure.input(z.object({ employeeId: id, status: z.enum(["pending", "approved", "rejected"]).optional() })).query(async ({ ctx, input }) => {
    await requirePermission(ctx, "corrections:read", await employeeBranchOrThrow(input.employeeId));
    return db.select().from(attendanceCorrections).where(and(eq(attendanceCorrections.employeeId, input.employeeId), input.status ? eq(attendanceCorrections.status, input.status) : undefined));
  }),
  create: protectedProcedure.input(createCorrectionInput).mutation(async ({ ctx, input }) => {
    const branchId = await employeeBranchOrThrow(input.employeeId);
    await requirePermission(ctx, "corrections:manage", branchId);
    if (input.disputedEventId) {
      const [event] = await db.select().from(attendanceEvents).where(eq(attendanceEvents.id, input.disputedEventId)).limit(1);
      if (!event || event.employeeId !== input.employeeId) throw new TRPCError({ code: "BAD_REQUEST", message: "Disputed event must belong to the employee" });
    }
    const [correction] = await db.insert(attendanceCorrections).values({ ...input, disputedEventId: input.disputedEventId ?? null, proposedTime: input.proposedTime ?? null, requestedBy: requireSessionUser(ctx) }).returning();
    return correction;
  }),
  update: protectedProcedure
    .input(z.object({ id, values: correctionValues.partial() }))
    .mutation(async ({ ctx, input }) => {
      const [current] = await db.select().from(attendanceCorrections).where(eq(attendanceCorrections.id, input.id)).limit(1);
      if (!current) notFound("Correction");
      await requirePermission(ctx, "corrections:manage", await employeeBranchOrThrow(current.employeeId));
      if (current.status !== "pending") throw new TRPCError({ code: "CONFLICT", message: "Only pending corrections can be changed" });
      if (current.requestedBy !== requireSessionUser(ctx)) throw new TRPCError({ code: "FORBIDDEN", message: "Only the requester can change a correction" });
      const [correction] = await db.update(attendanceCorrections).set(input.values).where(eq(attendanceCorrections.id, input.id)).returning();
      return correction;
    }),
  review: protectedProcedure
    .input(z.object({ id, status: z.enum(["approved", "rejected"]), reviewNote: z.string().trim().min(1).nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      const [current] = await db.select().from(attendanceCorrections).where(eq(attendanceCorrections.id, input.id)).limit(1);
      if (!current) notFound("Correction");
      await requirePermission(ctx, "corrections:review", await employeeBranchOrThrow(current.employeeId));
      const reviewer = requireSessionUser(ctx);
      if (current.requestedBy === reviewer) throw new TRPCError({ code: "FORBIDDEN", message: "A requester cannot review their own correction" });
      if (current.status !== "pending") throw new TRPCError({ code: "CONFLICT", message: "Correction has already been reviewed" });
      const [correction] = await db.update(attendanceCorrections).set({ status: input.status, reviewNote: input.reviewNote ?? null, reviewedBy: reviewer, reviewedAt: new Date() }).where(eq(attendanceCorrections.id, input.id)).returning();
      return correction;
    }),
});
