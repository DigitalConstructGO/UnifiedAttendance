import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import { cosigners, departments, employees, people, positions } from "@UnifiedAttendance/db/schema/index";

import { notFound } from "../../errors";
import { requirePermission } from "../shared/guards";

import type {
  CreateCosignerInput,
  CreateDepartmentInput,
  CreateEmployeeInput,
  CreatePositionInput,
  ListEmployeesInput,
  ResourceIdInput,
  UpdateCosignerInput,
  UpdateDepartmentInput,
  UpdateEmployeeInput,
  UpdatePositionInput,
} from "../../validations/workforce";
import type { Context } from "../../context";

async function employeeOrThrow(employeeId: string) {
  const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
  if (!employee) notFound("Employee");
  return employee;
}

export async function listDepartments(ctx: Context) {
  await requirePermission(ctx, "workforce:read");
  return db.select().from(departments).orderBy(departments.name);
}

export async function createDepartment(ctx: Context, input: CreateDepartmentInput) {
  await requirePermission(ctx, "workforce:manage", input.branchId ?? undefined);
  const [department] = await db.insert(departments).values({ ...input, branchId: input.branchId ?? null }).returning();
  return department;
}

export async function updateDepartment(ctx: Context, input: UpdateDepartmentInput) {
  const [existing] = await db.select().from(departments).where(eq(departments.id, input.id)).limit(1);
  if (!existing) notFound("Department");
  await requirePermission(ctx, "workforce:manage", existing.branchId ?? undefined);
  if (input.branchId && input.branchId !== existing.branchId) await requirePermission(ctx, "workforce:manage", input.branchId);
  const { id: departmentId, ...values } = input;
  const [department] = await db.update(departments).set(values).where(eq(departments.id, departmentId)).returning();
  return department;
}

export async function deleteDepartment(ctx: Context, input: ResourceIdInput) {
  const [department] = await db.select().from(departments).where(eq(departments.id, input.id)).limit(1);
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
  const [position] = await db.update(positions).set(values).where(eq(positions.id, positionId)).returning();
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
  const [cosigner] = await db.update(cosigners).set(values).where(eq(cosigners.id, cosignerId)).returning();
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
  return result;
}

export async function createEmployee(ctx: Context, input: CreateEmployeeInput) {
  await requirePermission(ctx, "workforce:manage", input.employee.branchId);
  return db.transaction(async (tx) => {
    const [person] = await tx.insert(people).values({ ...input.person, cosignerId: input.person.cosignerId ?? null }).returning();
    if (!person) throw new Error("Person creation failed");
    const [employee] = await tx.insert(employees).values({ ...input.employee, personId: person.id, departmentId: input.employee.departmentId ?? null, positionId: input.employee.positionId ?? null }).returning();
    if (!employee) throw new Error("Employee creation failed");
    return { employee, person };
  });
}

export async function updateEmployee(ctx: Context, input: UpdateEmployeeInput) {
  const current = await employeeOrThrow(input.id);
  await requirePermission(ctx, "workforce:manage", current.branchId);
  if (input.employee?.branchId && input.employee.branchId !== current.branchId) await requirePermission(ctx, "workforce:manage", input.employee.branchId);
  return db.transaction(async (tx) => {
    const [person] = input.person && Object.keys(input.person).length > 0
      ? await tx.update(people).set(input.person).where(eq(people.id, current.personId)).returning()
      : [undefined];
    const { branchId, departmentId, positionId, ...employeeValues } = input.employee ?? {};
    const [employee] = input.employee && Object.keys(input.employee).length > 0
      ? await tx.update(employees).set({ ...employeeValues, ...(branchId === undefined ? {} : { branchId }), ...(departmentId === undefined ? {} : { departmentId }), ...(positionId === undefined ? {} : { positionId }) }).where(eq(employees.id, input.id)).returning()
      : [current];
    return { employee, person: person ?? null };
  });
}
