import { z } from "zod";

import { date, id, nullableText, text } from "./shared";

export const deviceIdInput = z.object({ id });
export const listDevicesInput = z.object({ branchId: id });

export const createDeviceInput = z.object({
  branchId: id,
  name: text,
  model: nullableText,
  serialNumber: text,
  ipAddress: nullableText,
  firmwareVersion: nullableText,
});

export const updateDeviceInput = z.object({
  id,
  branchId: id.optional(),
  name: text.optional(),
  model: nullableText,
  serialNumber: text.optional(),
  ipAddress: nullableText,
  firmwareVersion: nullableText,
  status: z.enum(["active", "inactive"]).optional(),
});

export const listIdentitiesInput = z.object({ employeeId: id });

export const assignIdentityInput = z.object({
  employeeId: id,
  deviceIdentityNumber: text,
  validFrom: date,
  validTo: date.nullable().optional(),
});

export const closeIdentityInput = z.object({ id, validTo: date });

export type DeviceIdInput = z.output<typeof deviceIdInput>;
export type ListDevicesInput = z.output<typeof listDevicesInput>;
export type CreateDeviceInput = z.output<typeof createDeviceInput>;
export type UpdateDeviceInput = z.output<typeof updateDeviceInput>;
export type ListIdentitiesInput = z.output<typeof listIdentitiesInput>;
export type AssignIdentityInput = z.output<typeof assignIdentityInput>;
export type CloseIdentityInput = z.output<typeof closeIdentityInput>;
