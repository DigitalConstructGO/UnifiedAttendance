import { createDevice, listDevices } from "@UnifiedAttendance/api";
import { createDeviceInput, listDevicesInput } from "@UnifiedAttendance/api/validations/devices";
import { route } from "@/lib/route";

export const GET = route({
  input: listDevicesInput,
  handler: ({ ctx, input }) => listDevices(ctx, input),
});

export const POST = route({
  input: createDeviceInput,
  status: 201,
  handler: ({ ctx, input }) => createDevice(ctx, input),
});
