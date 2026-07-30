import { asc, eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import {
  attendanceCorrections,
  attendanceEvents,
  departments,
  employmentContracts,
  employmentPeriods,
  employees,
  people,
  positions,
} from "@UnifiedAttendance/db/schema/index";
import { EMPLOYEE_STATUSES } from "@UnifiedAttendance/db/schema/workforce-enums";

import { badRequest, conflict } from "../../errors";
import { requirePermission } from "../shared/guards";
import { employeeOrThrow } from "./shared";

import type {
  CreateEmployeeInput,
  ListEmployeesInput,
  ResourceIdInput,
  UpdateEmployeeInput,
} from "../../validations/workforce";
import type { Context } from "../../context";

/** Assignment fields may only change through an effective-dated transition. */
const ASSIGNMENT_FIELDS = [
  "branchId",
  "departmentId",
  "positionId",
  "employmentType",
  "status",
] as const;

const employeeSelection = {
  employee: employees,
  person: people,
  department: departments,
  position: positions,
};

function employeeQuery() {
  return db
    .select(employeeSelection)
    .from(employees)
    .innerJoin(people, eq(employees.personId, people.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(positions, eq(employees.positionId, positions.id));
}

export async function listEmployees(ctx: Context, input: ListEmployeesInput) {
  await requirePermission(ctx, "workforce:read", input.branchId);
  return employeeQuery().where(eq(employees.branchId, input.branchId));
}

export async function getEmployee(ctx: Context, input: ResourceIdInput) {
  const employee = await employeeOrThrow(input.id);
  await requirePermission(ctx, "workforce:read", employee.branchId);
  const [result] = await employeeQuery().where(eq(employees.id, input.id));
  const periods = await db
    .select({ period: employmentPeriods, department: departments, position: positions })
    .from(employmentPeriods)
    .leftJoin(departments, eq(employmentPeriods.departmentId, departments.id))
    .leftJoin(positions, eq(employmentPeriods.positionId, positions.id))
    .where(eq(employmentPeriods.employeeId, input.id))
    .orderBy(asc(employmentPeriods.effectiveFrom));
  return { ...result, periods };
}

export async function createEmployee(ctx: Context, input: CreateEmployeeInput) {
  await requirePermission(ctx, "workforce:manage", input.employee.branchId);
  return db.transaction(async (tx) => {
    const [person] = await tx.insert(people).values(input.person).returning();
    if (!person) throw new Error("Person creation failed");
    const [employee] = await tx
      .insert(employees)
      .values({
        ...input.employee,
        personId: person.id,
        departmentId: input.employee.departmentId ?? null,
        positionId: input.employee.positionId ?? null,
      })
      .returning();
    if (!employee) throw new Error("Employee creation failed");
    const [period] = await tx
      .insert(employmentPeriods)
      .values({
        employeeId: employee.id,
        branchId: input.employee.branchId,
        departmentId: input.employee.departmentId ?? null,
        positionId: input.employee.positionId ?? null,
        employmentType: input.employee.employmentType,
        status: EMPLOYEE_STATUSES[0],
        effectiveFrom: input.employee.hireDate,
      })
      .returning();
    return { employee, person, period };
  });
}

export async function updateEmployee(ctx: Context, input: UpdateEmployeeInput) {
  if (input.employee && ASSIGNMENT_FIELDS.some((field) => input.employee?.[field] !== undefined)) {
    badRequest("Use an effective-dated employment transition to change an assignment or status");
  }
  const current = await employeeOrThrow(input.id);
  await requirePermission(ctx, "workforce:manage", current.branchId);
  if (input.employee?.branchId && input.employee.branchId !== current.branchId)
    await requirePermission(ctx, "workforce:manage", input.employee.branchId);
  return db.transaction(async (tx) => {
    const [person] =
      input.person && Object.keys(input.person).length > 0
        ? await tx
            .update(people)
            .set(input.person)
            .where(eq(people.id, current.personId))
            .returning()
        : [undefined];
    const { branchId, departmentId, positionId, ...employeeValues } = input.employee ?? {};
    const [employee] =
      input.employee && Object.keys(input.employee).length > 0
        ? await tx
            .update(employees)
            .set({
              ...employeeValues,
              ...(branchId === undefined ? {} : { branchId }),
              ...(departmentId === undefined ? {} : { departmentId }),
              ...(positionId === undefined ? {} : { positionId }),
            })
            .where(eq(employees.id, input.id))
            .returning()
        : [current];
    return { employee, person: person ?? null };
  });
}

/** Removes an employee identity only when it has no immutable attendance history. */
export async function deleteEmployee(ctx: Context, input: ResourceIdInput) {
  const employee = await employeeOrThrow(input.id);
  await requirePermission(ctx, "workforce:manage", employee.branchId);
  const [contract] = await db
    .select({ id: employmentContracts.id })
    .from(employmentContracts)
    .where(eq(employmentContracts.employeeId, input.id))
    .limit(1);
  if (contract) {
    conflict("Employees with employment contracts cannot be deleted; terminate them instead");
  }
  const [event] = await db
    .select({ id: attendanceEvents.id })
    .from(attendanceEvents)
    .where(eq(attendanceEvents.employeeId, input.id))
    .limit(1);
  const [correction] = await db
    .select({ id: attendanceCorrections.id })
    .from(attendanceCorrections)
    .where(eq(attendanceCorrections.employeeId, input.id))
    .limit(1);
  if (event || correction) {
    conflict(
      "Employees with attendance history cannot be deleted; terminate their employment instead",
    );
  }
  return db.transaction(async (tx) => {
    const [deleted] = await tx.delete(employees).where(eq(employees.id, input.id)).returning();
    await tx.delete(people).where(eq(people.id, employee.personId));
    return deleted;
  });
}
