import { deviceIdInput, updateDeviceInput } from "@UnifiedAttendance/api/validations/devices";
import { getDevice, updateDevice } from "@UnifiedAttendance/api";
import { route } from "@/lib/route";

export const GET = route({ input: deviceIdInput, handler: ({ ctx, input }) => getDevice(ctx, input) });

export const PATCH = route({
  input: updateDeviceInput,
  handler: ({ ctx, input }) => updateDevice(ctx, input),
});
