import { deviceCommandPoll } from "@UnifiedAttendance/api";
import { deviceContext, serialNumber, textResponse } from "@/lib/iclock";

export const dynamic = "force-dynamic";

/**
 * The command queue the reader polls every `Delay` seconds. Nothing enqueues
 * commands yet, so the answer is always `OK` — but it has to be answered on
 * time, because this poll is also how a reader with nobody punching proves it
 * is still alive.
 */
export async function GET(request: Request) {
  const serial = serialNumber(request);
  if (!serial) return textResponse("", 400);
  return textResponse(await deviceCommandPoll(deviceContext(), { serialNumber: serial }));
}
