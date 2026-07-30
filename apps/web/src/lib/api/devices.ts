import type { z } from "zod";
import type * as service from "@UnifiedAttendance/api/modules/devices/service";
import type * as validations from "@UnifiedAttendance/api/validations/devices";

import { apiFetch, type JsonOf } from "./client";

export type Device = JsonOf<Awaited<ReturnType<typeof service.listDevices>>>[number];
export type DeviceIdentity = JsonOf<Awaited<ReturnType<typeof service.listIdentities>>>[number];

export const devicesKeys = {
  devices: (branchId: string) => ["devices", { branchId }] as const,
  device: (id: string) => ["devices", id] as const,
  identities: (employeeId: string) => ["device-identities", { employeeId }] as const,
};

export const devicesApi = {
  list: (branchId: string, signal?: AbortSignal) =>
    apiFetch<Device[]>("/devices", { query: { branchId }, signal }),
  get: (id: string, signal?: AbortSignal) => apiFetch<Device>(`/devices/${id}`, { signal }),
  create: (input: z.input<typeof validations.createDeviceInput>) =>
    apiFetch<Device>("/devices", { method: "POST", body: input }),
  update: ({ id, ...values }: z.input<typeof validations.updateDeviceInput>) =>
    apiFetch<Device>(`/devices/${id}`, { method: "PATCH", body: values }),

  identities: (employeeId: string, signal?: AbortSignal) =>
    apiFetch<DeviceIdentity[]>("/device-identities", { query: { employeeId }, signal }),
  assignIdentity: (input: z.input<typeof validations.assignIdentityInput>) =>
    apiFetch<DeviceIdentity>("/device-identities", { method: "POST", body: input }),
  closeIdentity: ({ id, ...values }: z.input<typeof validations.closeIdentityInput>) =>
    apiFetch<DeviceIdentity>(`/device-identities/${id}`, { method: "PATCH", body: values }),
};
