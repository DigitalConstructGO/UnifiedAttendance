/**
 * The wire format ZKTeco readers speak (ADMS / "TA Push"), kept free of the
 * database so it can be tested against real captured bodies.
 *
 * Nothing here is a REST API. The reader opens the connection, posts
 * tab-separated text, and expects a bare `OK` back — no JSON, no status codes
 * it understands, no auth header it is capable of sending. Anything we return
 * that it does not recognise makes it retry the same batch forever.
 */

/** `0` check-in, `1` check-out, `2` break-out, `3` break-in, `4` overtime-in, `5` overtime-out. */
const STATUS_DIRECTION: Record<string, "in" | "out"> = {
  "0": "in",
  "1": "out",
  "2": "out",
  "3": "in",
  "4": "in",
  "5": "out",
};

export type AttendanceRecord = {
  /** The badge number as the reader knows it. Matching it to a person is our job, not the reader's. */
  identityNumber: string;
  /** Wall-clock at the reader, `YYYY-MM-DD HH:mm:ss`. It carries no zone. */
  localTime: string;
  /** The date the branch calls this punch, taken from the reader's own clock. */
  localDate: string;
  direction: "in" | "out" | "unknown";
  punchState: string | null;
  verifyMode: string | null;
};

export type ParsedAttlog = {
  records: AttendanceRecord[];
  rejected: string[];
};

const LOCAL_TIME = /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2})$/;

function normaliseTime(value: string) {
  const trimmed = value.trim();
  const match = LOCAL_TIME.exec(trimmed);
  if (match) return { localTime: trimmed, localDate: match[1]! };

  if (/^\d{9,11}$/.test(trimmed)) {
    const iso = new Date(Number(trimmed) * 1000).toISOString();
    return { localTime: `${iso.slice(0, 10)} ${iso.slice(11, 19)}`, localDate: iso.slice(0, 10) };
  }
  return null;
}


export function parseAttlog(body: string): ParsedAttlog {
  const records: AttendanceRecord[] = [];
  const rejected: string[] = [];

  for (const line of body.split(/\r?\n/)) {
    if (line.trim().length === 0) continue;
    const [pin = "", time = "", status = "", verify = ""] = line.split("\t");
    const identityNumber = pin.trim();
    const stamp = normaliseTime(time);
    if (identityNumber.length === 0 || !stamp) {
      rejected.push(line);
      continue;
    }
    const punchState = status.trim() || null;
    records.push({
      identityNumber,
      localTime: stamp.localTime,
      localDate: stamp.localDate,
      // An unrecognised state still happened — it becomes an event with an
      // unknown direction rather than being thrown away.
      direction: (punchState === null ? undefined : STATUS_DIRECTION[punchState]) ?? "unknown",
      punchState,
      verifyMode: verify.trim() || null,
    });
  }

  return { records, rejected };
}

/**
 * The reply to the reader's opening `GET /iclock/cdata?options=all`. It is the
 * only chance to configure the device, and `Realtime=1` is the line that
 * matters: without it the reader batches punches until `TransTimes` comes round
 * instead of pushing each one as it happens.
 */
export function deviceOptionsResponse(options: {
  serialNumber: string;
  /** Hours east of UTC for the branch this reader stands in. */
  timeZoneOffsetHours: number;
  stamp: string;
}) {
  return [
    `GET OPTION FROM: ${options.serialNumber}`,
    `Stamp=${options.stamp}`,
    `OpStamp=${options.stamp}`,
    // Seconds before retrying after a failure, and between idle command polls.
    "ErrorDelay=30",
    "Delay=10",
    "TransTimes=00:00;14:05",
    "TransInterval=1",
    // Attendance, operation and enrolment logs; photos and templates left off.
    "TransFlag=1111000000",
    `TimeZone=${options.timeZoneOffsetHours}`,
    "Realtime=1",
    "Encrypt=0",
    "ServerVer=2.4.1",
  ].join("\n");
}
