import { deviceHandshake, receivePush } from "@UnifiedAttendance/api";
import { deviceContext, serialNumber, tableName, textResponse } from "@/lib/iclock";

/** Never prerendered or cached — every call is a live reader reporting in. */
export const dynamic = "force-dynamic";

/**
 * The opening handshake. The reader asks for its configuration before it will
 * send anything, and the reply is what turns on `Realtime=1` — the difference
 * between punches arriving within seconds and arriving twice a day.
 */
export async function GET(request: Request) {
  const serial = serialNumber(request);
  if (!serial) return textResponse("", 400);
  return textResponse(await deviceHandshake(deviceContext(), { serialNumber: serial }));
}

/**
 * Attendance and operation uploads. The body is tab-separated text, not JSON,
 * and the reader only understands a bare `OK` in reply.
 *
 * It answers `OK` even when the batch could not be read. The bytes are already
 * stored and the failure is on the batch row; telling the reader otherwise
 * makes it resend the same unreadable batch forever and block the queue behind
 * it.
 */
export async function POST(request: Request) {
  const serial = serialNumber(request);
  if (!serial) return textResponse("", 400);

  const rawBody = await request.text();
  const result = await receivePush(deviceContext(), {
    serialNumber: serial,
    endpoint: "/iclock/cdata",
    table: tableName(request),
    rawBody,
  });

  // Some firmwares read the count back; the rest ignore everything after "OK".
  return textResponse(`OK: ${result.accepted}`);
}
