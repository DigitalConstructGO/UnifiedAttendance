import { asc, eq } from "drizzle-orm";

import { employmentPeriods, employees } from "@UnifiedAttendance/db/schema/index";

import { requirePermission } from "../shared/guards";
import { unprocessableContent } from "../../errors";
import { withTransaction } from "../../context";
import {
  employeeOrThrow,
  openEmploymentOrThrow,
  positionFitsDepartmentOrThrow,
  previousDate,
} from "./shared";

import type {
  ListEmploymentPeriodsInput,
  TransitionEmploymentInput,
} from "../../validations/workforce";
import type { Context } from "../../context";

export async function listEmploymentPeriods(ctx: Context, input: ListEmploymentPeriodsInput) {
  const employee = await employeeOrThrow(ctx, input.employeeId);
  await requirePermission(ctx, "employment.read", employee.branchId);
  return ctx.db
    .select()
    .from(employmentPeriods)
    .where(eq(employmentPeriods.employeeId, input.employeeId))
    .orderBy(asc(employmentPeriods.effectiveFrom));
}

/** Starts a new effective-dated assignment without rewriting prior employment history. */
export async function transitionEmployment(ctx: Context, input: TransitionEmploymentInput) {
  const employee = await employeeOrThrow(ctx, input.employeeId);
  const current = await openEmploymentOrThrow(ctx, input.employeeId);
  await requirePermission(ctx, "employment.transition", current.branchId);
  if (input.branchId !== current.branchId) {
    await requirePermission(ctx, "employment.transition", input.branchId);
  }
  await positionFitsDepartmentOrThrow(ctx, input.positionId, input.departmentId);
  if (input.effectiveFrom <= current.effectiveFrom) {
    unprocessableContent(
      "An employment transition must take effect after the current period begins",
      {
        properties: {
          effectiveFrom: {
            errors: ["Choose a date after the current employment period begins."],
          },
        },
      },
    );
  }

  return withTransaction(ctx, async (ctx) => {
    await ctx.db
      .update(employmentPeriods)
      .set({ effectiveTo: previousDate(input.effectiveFrom) })
      .where(eq(employmentPeriods.id, current.id));
    const [period] = await ctx.db
      .insert(employmentPeriods)
      .values({
        employeeId: employee.id,
        branchId: input.branchId,
        departmentId: input.departmentId ?? null,
        positionId: input.positionId ?? null,
        employmentType: input.employmentType,
        status: input.status,
        effectiveFrom: input.effectiveFrom,
      })
      .returning();
    await ctx.db
      .update(employees)
      .set({
        branchId: input.branchId,
        departmentId: input.departmentId ?? null,
        positionId: input.positionId ?? null,
        employmentType: input.employmentType,
        status: input.status,
      })
      .where(eq(employees.id, employee.id));
    return period;
  });
}
