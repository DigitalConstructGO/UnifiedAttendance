import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@UnifiedAttendance/db";
import { cosigners, departments, employees, people, positions } from "@UnifiedAttendance/db/schema/index";

import { protectedProcedure, router } from "../index";
import { notFound, requirePermission } from "./shared";

const id = z.uuid();
const nullableText = z.string().trim().min(1).nullable().optional();
const nullableUrl = z.string().url().nullable().optional();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");
const personInput = z.object({
  firstName: z.string().trim().min(1),
  middleName: nullableText,
  lastName: z.string().trim().min(1),
  phone: nullableText,
  email: z.string().email().nullable().optional(),
  gender: z.enum(["male", "female"]).nullable().optional(),
  profilePhotoUrl: nullableUrl,
  nationalIdFrontUrl: nullableUrl,
  nationalIdBackUrl: nullableUrl,
  emergencyContactName: nullableText,
  emergencyContactPhone: nullableText,
  cosignerId: id.nullable().optional(),
});

async function employeeOrThrow(_ctx: Parameters<typeof requirePermission>[0], employeeId: string) {
  const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
  if (!employee) notFound("Employee");
  return employee;
}

export const workforceRouter = router({
  departments: protectedProcedure.query(async ({ ctx }) => {
    await requirePermission(ctx, "workforce:read");
    return db.select().from(departments).orderBy(departments.name);
  }),
  createDepartment: protectedProcedure
    .input(z.object({ name: z.string().trim().min(1), branchId: id.nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      await requirePermission(ctx, "workforce:manage", input.branchId ?? undefined);
      const [department] = await db.insert(departments).values({ ...input, branchId: input.branchId ?? null }).returning();
      return department;
    }),
  updateDepartment: protectedProcedure
    .input(z.object({ id, name: z.string().trim().min(1).optional(), status: z.enum(["active", "inactive"]).optional(), branchId: id.nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      const [existing] = await db.select().from(departments).where(eq(departments.id, input.id)).limit(1);
      if (!existing) notFound("Department");
      await requirePermission(ctx, "workforce:manage", existing.branchId ?? undefined);
      if (input.branchId && input.branchId !== existing.branchId) await requirePermission(ctx, "workforce:manage", input.branchId);
      const { id: departmentId, ...values } = input;
      const [department] = await db.update(departments).set(values).where(eq(departments.id, departmentId)).returning();
      return department;
    }),
  deleteDepartment: protectedProcedure.input(z.object({ id })).mutation(async ({ ctx, input }) => {
    const [department] = await db.select().from(departments).where(eq(departments.id, input.id)).limit(1);
    if (!department) notFound("Department");
    await requirePermission(ctx, "workforce:manage", department.branchId ?? undefined);
    const [deleted] = await db.delete(departments).where(eq(departments.id, input.id)).returning();
    return deleted;
  }),

  positions: protectedProcedure.query(async ({ ctx }) => {
    await requirePermission(ctx, "workforce:read");
    return db.select().from(positions).orderBy(positions.title);
  }),
  createPosition: protectedProcedure
    .input(z.object({ title: z.string().trim().min(1), description: nullableText }))
    .mutation(async ({ ctx, input }) => {
      await requirePermission(ctx, "workforce:manage");
      const [position] = await db.insert(positions).values(input).returning();
      return position;
    }),
  updatePosition: protectedProcedure
    .input(z.object({ id, title: z.string().trim().min(1).optional(), description: nullableText, status: z.enum(["active", "inactive"]).optional() }))
    .mutation(async ({ ctx, input }) => {
      await requirePermission(ctx, "workforce:manage");
      const { id: positionId, ...values } = input;
      const [position] = await db.update(positions).set(values).where(eq(positions.id, positionId)).returning();
      return position ?? null;
    }),
  deletePosition: protectedProcedure.input(z.object({ id })).mutation(async ({ ctx, input }) => {
    await requirePermission(ctx, "workforce:manage");
    const [deleted] = await db.delete(positions).where(eq(positions.id, input.id)).returning();
    return deleted ?? null;
  }),

  cosigners: protectedProcedure.query(async ({ ctx }) => {
    await requirePermission(ctx, "workforce:read");
    return db.select().from(cosigners).orderBy(cosigners.fullName);
  }),
  createCosigner: protectedProcedure
    .input(z.object({ fullName: z.string().trim().min(1), phone: nullableText, workplace: nullableText, nationalIdFrontUrl: nullableUrl, nationalIdBackUrl: nullableUrl, workplaceIdFrontUrl: nullableUrl, workplaceIdBackUrl: nullableUrl }))
    .mutation(async ({ ctx, input }) => {
      await requirePermission(ctx, "workforce:manage");
      const [cosigner] = await db.insert(cosigners).values(input).returning();
      return cosigner;
    }),
  updateCosigner: protectedProcedure
    .input(z.object({ id, fullName: z.string().trim().min(1).optional(), phone: nullableText, workplace: nullableText, nationalIdFrontUrl: nullableUrl, nationalIdBackUrl: nullableUrl, workplaceIdFrontUrl: nullableUrl, workplaceIdBackUrl: nullableUrl }))
    .mutation(async ({ ctx, input }) => {
      await requirePermission(ctx, "workforce:manage");
      const { id: cosignerId, ...values } = input;
      const [cosigner] = await db.update(cosigners).set(values).where(eq(cosigners.id, cosignerId)).returning();
      return cosigner ?? null;
    }),
  deleteCosigner: protectedProcedure.input(z.object({ id })).mutation(async ({ ctx, input }) => {
    await requirePermission(ctx, "workforce:manage");
    const [deleted] = await db.delete(cosigners).where(eq(cosigners.id, input.id)).returning();
    return deleted ?? null;
  }),

  employees: protectedProcedure.input(z.object({ branchId: id })).query(async ({ ctx, input }) => {
    await requirePermission(ctx, "workforce:read", input.branchId);
    return db
      .select({ employee: employees, person: people, department: departments, position: positions })
      .from(employees)
      .innerJoin(people, eq(employees.personId, people.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(positions, eq(employees.positionId, positions.id))
      .where(eq(employees.branchId, input.branchId));
  }),
  employee: protectedProcedure.input(z.object({ id })).query(async ({ ctx, input }) => {
    const employee = await employeeOrThrow(ctx, input.id);
    await requirePermission(ctx, "workforce:read", employee.branchId);
    const [result] = await db
      .select({ employee: employees, person: people, department: departments, position: positions })
      .from(employees)
      .innerJoin(people, eq(employees.personId, people.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(positions, eq(employees.positionId, positions.id))
      .where(eq(employees.id, input.id));
    return result;
  }),
  createEmployee: protectedProcedure
    .input(z.object({ person: personInput, employee: z.object({ branchId: id, departmentId: id.nullable().optional(), positionId: id.nullable().optional(), employeeCode: z.string().trim().min(1), employmentType: z.enum(["permanent", "contract", "part_time", "intern"]).default("permanent"), hireDate: date }) }))
    .mutation(async ({ ctx, input }) => {
      await requirePermission(ctx, "workforce:manage", input.employee.branchId);
      return db.transaction(async (tx) => {
        const [person] = await tx.insert(people).values({ ...input.person, cosignerId: input.person.cosignerId ?? null }).returning();
        if (!person) throw new Error("Person creation failed");
        const [employee] = await tx.insert(employees).values({ ...input.employee, personId: person.id, departmentId: input.employee.departmentId ?? null, positionId: input.employee.positionId ?? null }).returning();
        if (!employee) throw new Error("Employee creation failed");
        return { employee, person };
      });
    }),
  updateEmployee: protectedProcedure
    .input(z.object({ id, person: personInput.partial().optional(), employee: z.object({ branchId: id.optional(), departmentId: id.nullable().optional(), positionId: id.nullable().optional(), employeeCode: z.string().trim().min(1).optional(), employmentType: z.enum(["permanent", "contract", "part_time", "intern"]).optional(), hireDate: date.optional(), status: z.enum(["active", "suspended", "terminated"]).optional() }).optional() }))
    .mutation(async ({ ctx, input }) => {
      const current = await employeeOrThrow(ctx, input.id);
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
    }),
});
