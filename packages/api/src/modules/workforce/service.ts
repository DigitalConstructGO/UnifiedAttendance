import { asc, eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";

import { db } from "@UnifiedAttendance/db";
import {
  attendanceCorrections,
  attendanceEvents,
  cosigners,
  departments,
  employmentPeriods,
  employees,
  people,
  positions,
  workforceDocuments,
} from "@UnifiedAttendance/db/schema/index";

import { badRequest, conflict, notFound } from "../../errors";
import { requirePermission } from "../shared/guards";

import type {
  CreateCosignerInput,
  CreateDepartmentInput,
  CreateEmployeeInput,
  CreatePositionInput,
  CreateWorkforceDocumentInput,
  ListEmploymentPeriodsInput,
  ListEmployeesInput,
  ResourceIdInput,
  UpdateCosignerInput,
  UpdateDepartmentInput,
  UpdateEmployeeInput,
  UpdatePositionInput,
  TransitionEmploymentInput,
} from "../../validations/workforce";
import type { Context } from "../../context";

async function employeeOrThrow(employeeId: string) {
  const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
  if (!employee) notFound("Employee");
  return employee;
}

function previousDate(date: string) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() - 1);
  return value.toISOString().slice(0, 10);
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

async function openEmploymentOrThrow(employeeId: string) {
  const periods = await db
    .select()
    .from(employmentPeriods)
    .where(eq(employmentPeriods.employeeId, employeeId));
  const open = periods.find((period) => period.effectiveTo === null);
  if (!open) notFound("Open employment period");
  return open;
}

export async function listDepartments(ctx: Context) {
  await requirePermission(ctx, "workforce:read");
  return db.select().from(departments).orderBy(departments.name);
}

export async function createDepartment(ctx: Context, input: CreateDepartmentInput) {
  await requirePermission(ctx, "workforce:manage", input.branchId ?? undefined);
  const [department] = await db
    .insert(departments)
    .values({ ...input, branchId: input.branchId ?? null })
    .returning();
  return department;
}

export async function updateDepartment(ctx: Context, input: UpdateDepartmentInput) {
  const [existing] = await db
    .select()
    .from(departments)
    .where(eq(departments.id, input.id))
    .limit(1);
  if (!existing) notFound("Department");
  await requirePermission(ctx, "workforce:manage", existing.branchId ?? undefined);
  if (input.branchId && input.branchId !== existing.branchId)
    await requirePermission(ctx, "workforce:manage", input.branchId);
  const { id: departmentId, ...values } = input;
  const [department] = await db
    .update(departments)
    .set(values)
    .where(eq(departments.id, departmentId))
    .returning();
  return department;
}

export async function deleteDepartment(ctx: Context, input: ResourceIdInput) {
  const [department] = await db
    .select()
    .from(departments)
    .where(eq(departments.id, input.id))
    .limit(1);
  if (!department) notFound("Department");
  await requirePermission(ctx, "workforce:manage", department.branchId ?? undefined);
  const [deleted] = await db.delete(departments).where(eq(departments.id, input.id)).returning();
  return deleted;
}

export async function listPositions(ctx: Context) {
  await requirePermission(ctx, "workforce:read");
  return db.select().from(positions).orderBy(positions.title);
}

export async function createPosition(ctx: Context, input: CreatePositionInput) {
  await requirePermission(ctx, "workforce:manage");
  const [position] = await db.insert(positions).values(input).returning();
  return position;
}

export async function updatePosition(ctx: Context, input: UpdatePositionInput) {
  await requirePermission(ctx, "workforce:manage");
  const { id: positionId, ...values } = input;
  const [position] = await db
    .update(positions)
    .set(values)
    .where(eq(positions.id, positionId))
    .returning();
  return position ?? null;
}

export async function deletePosition(ctx: Context, input: ResourceIdInput) {
  await requirePermission(ctx, "workforce:manage");
  const [deleted] = await db.delete(positions).where(eq(positions.id, input.id)).returning();
  return deleted ?? null;
}

export async function listCosigners(ctx: Context) {
  await requirePermission(ctx, "workforce:read");
  return db.select().from(cosigners).orderBy(cosigners.fullName);
}

export async function createCosigner(ctx: Context, input: CreateCosignerInput) {
  await requirePermission(ctx, "workforce:manage");
  const [cosigner] = await db.insert(cosigners).values(input).returning();
  return cosigner;
}

export async function updateCosigner(ctx: Context, input: UpdateCosignerInput) {
  await requirePermission(ctx, "workforce:manage");
  const { id: cosignerId, ...values } = input;
  const [cosigner] = await db
    .update(cosigners)
    .set(values)
    .where(eq(cosigners.id, cosignerId))
    .returning();
  return cosigner ?? null;
}

export async function deleteCosigner(ctx: Context, input: ResourceIdInput) {
  await requirePermission(ctx, "workforce:manage");
  const [deleted] = await db.delete(cosigners).where(eq(cosigners.id, input.id)).returning();
  return deleted ?? null;
}

export async function listEmployees(ctx: Context, input: ListEmployeesInput) {
  await requirePermission(ctx, "workforce:read", input.branchId);
  return db
    .select({ employee: employees, person: people, department: departments, position: positions })
    .from(employees)
    .innerJoin(people, eq(employees.personId, people.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(positions, eq(employees.positionId, positions.id))
    .where(eq(employees.branchId, input.branchId));
}

export async function getEmployee(ctx: Context, input: ResourceIdInput) {
  const employee = await employeeOrThrow(input.id);
  await requirePermission(ctx, "workforce:read", employee.branchId);
  const [result] = await db
    .select({ employee: employees, person: people, department: departments, position: positions })
    .from(employees)
    .innerJoin(people, eq(employees.personId, people.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(positions, eq(employees.positionId, positions.id))
    .where(eq(employees.id, input.id));
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
    const [person] = await tx
      .insert(people)
      .values({ ...input.person, cosignerId: input.person.cosignerId ?? null })
      .returning();
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
        status: "active",
        effectiveFrom: input.employee.hireDate,
      })
      .returning();
    return { employee, person, period };
  });
}

export async function updateEmployee(ctx: Context, input: UpdateEmployeeInput) {
  const assignmentFields = [
    "branchId",
    "departmentId",
    "positionId",
    "employmentType",
    "status",
  ] as const;
  if (input.employee && assignmentFields.some((field) => input.employee?.[field] !== undefined)) {
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

/** Starts a new effective-dated assignment without rewriting prior employment history. */
export async function transitionEmployment(ctx: Context, input: TransitionEmploymentInput) {
  const employee = await employeeOrThrow(input.employeeId);
  const current = await openEmploymentOrThrow(input.employeeId);
  await requirePermission(ctx, "workforce:manage", current.branchId);
  if (input.branchId !== current.branchId) {
    await requirePermission(ctx, "workforce:manage", input.branchId);
  }
  if (input.effectiveFrom <= current.effectiveFrom) {
    throw new Error("An employment transition must take effect after the current period begins");
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

export async function listEmploymentPeriods(ctx: Context, input: ListEmploymentPeriodsInput) {
  const employee = await employeeOrThrow(input.employeeId);
  await requirePermission(ctx, "workforce:read", employee.branchId);
  return db
    .select()
    .from(employmentPeriods)
    .where(eq(employmentPeriods.employeeId, input.employeeId))
    .orderBy(asc(employmentPeriods.effectiveFrom));
}

/** Creates private metadata first; the web route returns the corresponding signed upload URL. */
export async function createWorkforceDocument(ctx: Context, input: CreateWorkforceDocumentInput) {
  if (input.personId) {
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.personId, input.personId))
      .limit(1);
    await requirePermission(ctx, "workforce:manage", employee?.branchId);
  } else {
    await requirePermission(ctx, "workforce:manage");
  }
  const owner = input.personId ?? input.cosignerId!;
  const [document] = await db
    .insert(workforceDocuments)
    .values({
      personId: input.personId ?? null,
      cosignerId: input.cosignerId ?? null,
      kind: input.kind,
      storageKey: `workforce/${owner}/${input.kind}/${randomUUID()}`,
      contentType: input.contentType,
      contentLength: input.contentLength,
    })
    .returning();
  return document;
}

export async function finalizeWorkforceDocument(ctx: Context, documentId: string) {
  const [document] = await db
    .select()
    .from(workforceDocuments)
    .where(eq(workforceDocuments.id, documentId))
    .limit(1);
  if (!document) notFound("Workforce document");
  if (document.personId) {
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.personId, document.personId))
      .limit(1);
    await requirePermission(ctx, "workforce:manage", employee?.branchId);
  } else {
    await requirePermission(ctx, "workforce:manage");
  }
  const [finalized] = await db
    .update(workforceDocuments)
    .set({ finalizedAt: new Date() })
    .where(eq(workforceDocuments.id, documentId))
    .returning();
  return finalized;
}

export async function getWorkforceDocument(ctx: Context, documentId: string) {
  const [document] = await db
    .select()
    .from(workforceDocuments)
    .where(eq(workforceDocuments.id, documentId))
    .limit(1);
  if (!document) notFound("Workforce document");
  if (document.personId) {
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.personId, document.personId))
      .limit(1);
    await requirePermission(ctx, "workforce:read", employee?.branchId);
  } else {
    await requirePermission(ctx, "workforce:read");
  }
  return document;
}

export async function deleteWorkforceDocument(ctx: Context, documentId: string) {
  const document = await getWorkforceDocument(ctx, documentId);
  if (document.personId) {
    const [employee] = await db
      .select()
      .from(employees)
      .where(eq(employees.personId, document.personId))
      .limit(1);
    await requirePermission(ctx, "workforce:manage", employee?.branchId);
  } else {
    await requirePermission(ctx, "workforce:manage");
  }
  await db.delete(workforceDocuments).where(eq(workforceDocuments.id, documentId));
  return document;
}
