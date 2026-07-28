import { eq } from "drizzle-orm";
import { z } from "zod";

import { db } from "@UnifiedAttendance/db";
import { attendanceDevices, employeeDeviceIdentities, employees } from "@UnifiedAttendance/db/schema/index";

import { protectedProcedure, router } from "../index";
import { notFound, requirePermission } from "./shared";

const id = z.uuid();
const nullableText = z.string().trim().min(1).nullable().optional();
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Expected YYYY-MM-DD");

async function deviceOrThrow(_ctx: Parameters<typeof requirePermission>[0], deviceId: string) {
  const [device] = await db.select().from(attendanceDevices).where(eq(attendanceDevices.id, deviceId)).limit(1);
  if (!device) notFound("Attendance Device");
  return device;
}

async function employeeOrThrow(_ctx: Parameters<typeof requirePermission>[0], employeeId: string) {
  const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
  if (!employee) notFound("Employee");
  return employee;
}

export const devicesRouter = router({
  list: protectedProcedure.input(z.object({ branchId: id })).query(async ({ ctx, input }) => {
    await requirePermission(ctx, "devices:read", input.branchId);
    return db.select().from(attendanceDevices).where(eq(attendanceDevices.branchId, input.branchId)).orderBy(attendanceDevices.name);
  }),
  get: protectedProcedure.input(z.object({ id })).query(async ({ ctx, input }) => {
    const device = await deviceOrThrow(ctx, input.id);
    await requirePermission(ctx, "devices:read", device.branchId);
    return device;
  }),
  create: protectedProcedure
    .input(z.object({ branchId: id, name: z.string().trim().min(1), model: nullableText, serialNumber: z.string().trim().min(1), ipAddress: nullableText, firmwareVersion: nullableText }))
    .mutation(async ({ ctx, input }) => {
      await requirePermission(ctx, "devices:manage", input.branchId);
      const [device] = await db.insert(attendanceDevices).values(input).returning();
      return device;
    }),
  update: protectedProcedure
    .input(z.object({ id, branchId: id.optional(), name: z.string().trim().min(1).optional(), model: nullableText, serialNumber: z.string().trim().min(1).optional(), ipAddress: nullableText, firmwareVersion: nullableText, status: z.enum(["active", "inactive"]).optional() }))
    .mutation(async ({ ctx, input }) => {
      const current = await deviceOrThrow(ctx, input.id);
      await requirePermission(ctx, "devices:manage", current.branchId);
      if (input.branchId && input.branchId !== current.branchId) await requirePermission(ctx, "devices:manage", input.branchId);
      const { id: deviceId, ...values } = input;
      const [device] = await db.update(attendanceDevices).set(values).where(eq(attendanceDevices.id, deviceId)).returning();
      return device;
    }),
  identities: protectedProcedure.input(z.object({ employeeId: id })).query(async ({ ctx, input }) => {
    const employee = await employeeOrThrow(ctx, input.employeeId);
    await requirePermission(ctx, "devices:read", employee.branchId);
    return db.select().from(employeeDeviceIdentities).where(eq(employeeDeviceIdentities.employeeId, input.employeeId));
  }),
  assignIdentity: protectedProcedure
    .input(z.object({ employeeId: id, deviceIdentityNumber: z.string().trim().min(1), validFrom: date, validTo: date.nullable().optional() }))
    .mutation(async ({ ctx, input }) => {
      const employee = await employeeOrThrow(ctx, input.employeeId);
      await requirePermission(ctx, "devices:manage", employee.branchId);
      const [identity] = await db.insert(employeeDeviceIdentities).values({ ...input, validTo: input.validTo ?? null }).returning();
      return identity;
    }),
  closeIdentity: protectedProcedure
    .input(z.object({ id, validTo: date }))
    .mutation(async ({ ctx, input }) => {
      const [identity] = await db.select().from(employeeDeviceIdentities).where(eq(employeeDeviceIdentities.id, input.id)).limit(1);
      if (!identity) notFound("Device identity");
      const employee = await employeeOrThrow(ctx, identity.employeeId);
      await requirePermission(ctx, "devices:manage", employee.branchId);
      const [updated] = await db.update(employeeDeviceIdentities).set({ validTo: input.validTo }).where(eq(employeeDeviceIdentities.id, input.id)).returning();
      return updated;
    }),
});
