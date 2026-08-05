import { recordCommandResult } from "@UnifiedAttendance/api";
import { deviceContext, serialNumber, textResponse } from "@/lib/iclock";

export const dynamic = "force-dynamic";

/**
 * The reader reporting what it did with a command it was handed, as
 * `ID=..&Return=..&Content=..`. Nothing issues commands yet, so this only ever
 * receives replies to commands we did not send — worth keeping anyway, because
 * a reader that answers here is a reader that is talking to us.
 */
export async function POST(request: Request) {
  const serial = serialNumber(request);
  if (!serial) return textResponse("", 400);
  const rawBody = await request.text();
  return textResponse(
    await recordCommandResult(deviceContext(), { serialNumber: serial, rawBody }),
  );
}
