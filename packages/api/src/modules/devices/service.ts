import { eq } from "drizzle-orm";

import { db } from "@UnifiedAttendance/db";
import { attendanceDevices, employeeDeviceIdentities, employees } from "@UnifiedAttendance/db/schema/index";

import { notFound } from "../../errors";
import { requirePermission } from "../shared/guards";

import type {
  AssignIdentityInput,
  CloseIdentityInput,
  CreateDeviceInput,
  DeviceIdInput,
  ListDevicesInput,
  ListIdentitiesInput,
  UpdateDeviceInput,
} from "../../validations/devices";
import type { Context } from "../../context";

async function deviceOrThrow(deviceId: string) {
  const [device] = await db.select().from(attendanceDevices).where(eq(attendanceDevices.id, deviceId)).limit(1);
  if (!device) notFound("Attendance Device");
  return device;
}

async function employeeOrThrow(employeeId: string) {
  const [employee] = await db.select().from(employees).where(eq(employees.id, employeeId)).limit(1);
  if (!employee) notFound("Employee");
  return employee;
}

export async function listDevices(ctx: Context, input: ListDevicesInput) {
  await requirePermission(ctx, "devices:read", input.branchId);
  return db.select().from(attendanceDevices).where(eq(attendanceDevices.branchId, input.branchId)).orderBy(attendanceDevices.name);
}

export async function getDevice(ctx: Context, input: DeviceIdInput) {
  const device = await deviceOrThrow(input.id);
  await requirePermission(ctx, "devices:read", device.branchId);
  return device;
}

export async function createDevice(ctx: Context, input: CreateDeviceInput) {
  await requirePermission(ctx, "devices:manage", input.branchId);
  const [device] = await db.insert(attendanceDevices).values(input).returning();
  return device;
}

export async function updateDevice(ctx: Context, input: UpdateDeviceInput) {
  const current = await deviceOrThrow(input.id);
  await requirePermission(ctx, "devices:manage", current.branchId);
  if (input.branchId && input.branchId !== current.branchId) await requirePermission(ctx, "devices:manage", input.branchId);
  const { id: deviceId, ...values } = input;
  const [device] = await db.update(attendanceDevices).set(values).where(eq(attendanceDevices.id, deviceId)).returning();
  return device;
}

export async function listIdentities(ctx: Context, input: ListIdentitiesInput) {
  const employee = await employeeOrThrow(input.employeeId);
  await requirePermission(ctx, "devices:read", employee.branchId);
  return db.select().from(employeeDeviceIdentities).where(eq(employeeDeviceIdentities.employeeId, input.employeeId));
}

export async function assignIdentity(ctx: Context, input: AssignIdentityInput) {
  const employee = await employeeOrThrow(input.employeeId);
  await requirePermission(ctx, "devices:manage", employee.branchId);
  const [identity] = await db.insert(employeeDeviceIdentities).values({ ...input, validTo: input.validTo ?? null }).returning();
  return identity;
}

/** Ends an identity's validity rather than deleting it — the history stays auditable. */
export async function closeIdentity(ctx: Context, input: CloseIdentityInput) {
  const [identity] = await db.select().from(employeeDeviceIdentities).where(eq(employeeDeviceIdentities.id, input.id)).limit(1);
  if (!identity) notFound("Device identity");
  const employee = await employeeOrThrow(identity.employeeId);
  await requirePermission(ctx, "devices:manage", employee.branchId);
  const [updated] = await db.update(employeeDeviceIdentities).set({ validTo: input.validTo }).where(eq(employeeDeviceIdentities.id, input.id)).returning();
  return updated;
}
