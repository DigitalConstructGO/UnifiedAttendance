import { asc, eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import { employmentPeriods, employees } from "@UnifiedAttendance/db/schema/index";

import { notFound } from "../../errors";

export async function employeeOrThrow(employeeId: string) {
  const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
  if (!employee) notFound("Employee");
  return employee;
}

/** The assignment in force on a local calendar date. */
export async function employmentAt(employeeId: string, date: string) {
  const periods = await db
    .select()
    .from(employmentPeriods)
    .where(eq(employmentPeriods.employeeId, employeeId))
    .orderBy(asc(employmentPeriods.effectiveFrom));
  return periods.find(
    (period) => period.effectiveFrom <= date && (!period.effectiveTo || period.effectiveTo >= date),
  );
}

export async function openEmploymentOrThrow(employeeId: string) {
  const periods = await db
    .select()
    .from(employmentPeriods)
    .where(eq(employmentPeriods.employeeId, employeeId));
  const open = periods.find((period) => period.effectiveTo === null);
  if (!open) notFound("Open employment period");
  return open;
}

export function previousDate(date: string) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
}
