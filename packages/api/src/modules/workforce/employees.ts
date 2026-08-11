import { and, asc, eq, isNotNull, isNull } from "drizzle-orm";

import {
  attendanceCorrections,
  attendanceEvents,
  clients,
  departments,
  employmentContracts,
  employmentPeriods,
  employees,
  manualAttendanceEntries,
  people,
  positions,
} from "@UnifiedAttendance/db/schema/index";
import { EMPLOYEE_STATUSES } from "@UnifiedAttendance/db/schema/workforce-enums";

import { badRequest, conflict } from "../../errors";
import { withTransaction } from "../../context";
import { requirePermission } from "../shared/guards";
import { isDuplicateEmployeeCode, nextEmployeeCode } from "./employee-code";
import { employeeOrThrow, positionFitsDepartmentOrThrow } from "./shared";

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

function employeeQuery(ctx: Context) {
  return ctx.db
    .select(employeeSelection)
    .from(employees)
    .innerJoin(people, eq(employees.personId, people.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(positions, eq(employees.positionId, positions.id));
}

export async function listEmployees(ctx: Context, input: ListEmployeesInput) {
  await requirePermission(ctx, "workforce:read", input.branchId);
  return employeeQuery(ctx).where(
    and(
      eq(employees.branchId, input.branchId),
      input.archived ? isNotNull(employees.archivedAt) : isNull(employees.archivedAt),
    ),
  );
}

export async function getEmployee(ctx: Context, input: ResourceIdInput) {
  const employee = await employeeOrThrow(ctx, input.id);
  await requirePermission(ctx, "workforce:read", employee.branchId);
  const [result] = await employeeQuery(ctx).where(eq(employees.id, input.id));
  const periods = await ctx.db
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
  await positionFitsDepartmentOrThrow(ctx, input.employee.positionId, input.employee.departmentId);
  const manualCode = input.employee.employeeCode;
  if (manualCode) {
    const [taken] = await ctx.db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.employeeCode, manualCode))
      .limit(1);
    if (taken) conflict("Employee ID already in use");
  }
  // A generated code can be claimed by a concurrent creation between reading
  // the sequence and inserting; the unique index catches that, and the next
  // attempt reads a fresh number.
  for (let attempt = 0; ; attempt += 1) {
    const employeeCode =
      manualCode ??
      (await nextEmployeeCode(ctx, input.employee.branchId, input.employee.departmentId ?? null));
    try {
      return await createEmployeeRecords(ctx, input, employeeCode);
    } catch (error) {
      if (manualCode || attempt >= 2 || !isDuplicateEmployeeCode(error)) throw error;
    }
  }
}

async function createEmployeeRecords(
  ctx: Context,
  input: CreateEmployeeInput,
  employeeCode: string,
) {
  return withTransaction(ctx, async (ctx) => {
    const [person] = await ctx.db.insert(people).values(input.person).returning();
    if (!person) throw new Error("Person creation failed");
    const [employee] = await ctx.db
      .insert(employees)
      .values({
        ...input.employee,
        employeeCode,
        personId: person.id,
        departmentId: input.employee.departmentId ?? null,
        positionId: input.employee.positionId ?? null,
      })
      .returning();
    if (!employee) throw new Error("Employee creation failed");
    const [period] = await ctx.db
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
  const current = await employeeOrThrow(ctx, input.id);
  await requirePermission(ctx, "workforce:manage", current.branchId);
  if (input.employee?.branchId && input.employee.branchId !== current.branchId)
    await requirePermission(ctx, "workforce:manage", input.employee.branchId);
  return withTransaction(ctx, async (ctx) => {
    const [person] =
      input.person && Object.keys(input.person).length > 0
        ? await ctx.db
            .update(people)
            .set(input.person)
            .where(eq(people.id, current.personId))
            .returning()
        : [undefined];
    const { branchId, departmentId, positionId, ...employeeValues } = input.employee ?? {};
    const [employee] =
      input.employee && Object.keys(input.employee).length > 0
        ? await ctx.db
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

export async function archiveEmployee(ctx: Context, input: ResourceIdInput) {
  const employee = await employeeOrThrow(ctx, input.id);
  await requirePermission(ctx, "workforce:manage", employee.branchId);
  const [archived] = await ctx.db
    .update(employees)
    .set({ archivedAt: new Date() })
    .where(and(eq(employees.id, input.id), isNull(employees.archivedAt)))
    .returning();
  return archived ?? employee;
}

export async function restoreEmployee(ctx: Context, input: ResourceIdInput) {
  const employee = await employeeOrThrow(ctx, input.id);
  await requirePermission(ctx, "workforce:manage", employee.branchId);
  const [restored] = await ctx.db
    .update(employees)
    .set({ archivedAt: null })
    .where(eq(employees.id, input.id))
    .returning();
  return restored;
}

export async function deleteEmployee(ctx: Context, input: ResourceIdInput) {
  const employee = await employeeOrThrow(ctx, input.id);
  await requirePermission(ctx, "workforce:manage", employee.branchId);
  if (!employee.archivedAt) {
    conflict("Archive the employee first; delete for good is only offered from the archive");
  }
  const [contract] = await ctx.db
    .select({ id: employmentContracts.id })
    .from(employmentContracts)
    .where(eq(employmentContracts.employeeId, input.id))
    .limit(1);
  if (contract) {
    conflict("Employees with employment contracts cannot be deleted; terminate them instead");
  }
  const [ownedClient] = await ctx.db
    .select({ id: clients.id })
    .from(clients)
    .where(eq(clients.ownerEmployeeId, input.id))
    .limit(1);
  if (ownedClient) {
    conflict("This employee owns clients; move those clients to another owner first");
  }

  return withTransaction(ctx, async (ctx) => {
    await ctx.db
      .delete(attendanceCorrections)
      .where(eq(attendanceCorrections.employeeId, input.id));
    await ctx.db
      .delete(manualAttendanceEntries)
      .where(eq(manualAttendanceEntries.employeeId, input.id));
    await ctx.db.delete(attendanceEvents).where(eq(attendanceEvents.employeeId, input.id));
    const [deleted] = await ctx.db.delete(employees).where(eq(employees.id, input.id)).returning();
    await ctx.db.delete(people).where(eq(people.id, employee.personId));
    return deleted;
  });
}
