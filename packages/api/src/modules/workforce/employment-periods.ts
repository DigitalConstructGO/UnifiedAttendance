import { asc, eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import { employmentPeriods, employees } from "@UnifiedAttendance/db/schema/index";

import { requirePermission } from "../shared/guards";
import { unprocessableContent } from "../../errors";
import { employeeOrThrow, openEmploymentOrThrow, previousDate } from "./shared";

import type {
  ListEmploymentPeriodsInput,
  TransitionEmploymentInput,
} from "../../validations/workforce";
import type { Context } from "../../context";

export async function listEmploymentPeriods(ctx: Context, input: ListEmploymentPeriodsInput) {
  const employee = await employeeOrThrow(input.employeeId);
  await requirePermission(ctx, "workforce:read", employee.branchId);
  return db
    .select()
    .from(employmentPeriods)
    .where(eq(employmentPeriods.employeeId, input.employeeId))
    .orderBy(asc(employmentPeriods.effectiveFrom));
}

/** Starts a new effective-dated assignment without rewriting prior employment history. */
export async function transitionEmployment(ctx: Context, input: TransitionEmploymentInput) {
  const employee = await employeeOrThrow(input.employeeId);
  const current = await openEmploymentOrThrow(input.employeeId);
  await requirePermission(ctx, "workforce:manage", current.branchId);
  if (input.branchId !== current.branchId) {
    await requirePermission(ctx, "workforce:manage", input.branchId);
  }
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

  return db.transaction(async (tx) => {
    await tx
      .update(employmentPeriods)
      .set({ effectiveTo: previousDate(input.effectiveFrom) })
      .where(eq(employmentPeriods.id, current.id));
    const [period] = await tx
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
    await tx
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
