export type PunchTimes = {
  firstIn: Date | null;
  lastOut: Date | null;
  outcomeOverride: "absent" | "present" | null;
  latenessExcused: boolean;
};

type ManualEntry = {
  kind: "check_in" | "check_out" | "mark_present" | "mark_absent";
  occurredAt: Date | null;
};

type Correction = {
  type:
    | "add_check_in"
    | "add_check_out"
    | "adjust_check_in"
    | "adjust_check_out"
    | "mark_absent"
    | "mark_present"
    | "excuse_lateness";
  proposedTime: Date | null;
};

/**
 * Manual entries widen the day: a manual check-in can only move `firstIn` earlier
 * and a manual check-out can only move `lastOut` later. Applied in creation order.
 */
export function applyManualEntries(base: PunchTimes, entries: ManualEntry[]): PunchTimes {
  const { latenessExcused } = base;
  let { firstIn, lastOut, outcomeOverride } = base;

  for (const entry of entries) {
    switch (entry.kind) {
      case "check_in":
        if (entry.occurredAt && (!firstIn || entry.occurredAt < firstIn))
          firstIn = entry.occurredAt;
        outcomeOverride = null;
        break;
      case "check_out":
        if (entry.occurredAt && (!lastOut || entry.occurredAt > lastOut))
          lastOut = entry.occurredAt;
        outcomeOverride = null;
        break;
      case "mark_absent":
        firstIn = null;
        lastOut = null;
        outcomeOverride = "absent";
        break;
      case "mark_present":
        outcomeOverride = "present";
        break;
    }
  }

  return { firstIn, lastOut, outcomeOverride, latenessExcused };
}

/**
 * Approved corrections replace a punch outright rather than widening it,
 * because a correction states what the time should have been.
 */
export function applyCorrections(base: PunchTimes, corrections: Correction[]): PunchTimes {
  let { firstIn, lastOut, outcomeOverride, latenessExcused } = base;

  for (const correction of corrections) {
    switch (correction.type) {
      case "add_check_in":
      case "adjust_check_in":
        firstIn = correction.proposedTime ?? firstIn;
        outcomeOverride = null;
        break;
      case "add_check_out":
      case "adjust_check_out":
        lastOut = correction.proposedTime ?? lastOut;
        outcomeOverride = null;
        break;
      case "mark_absent":
        firstIn = null;
        lastOut = null;
        outcomeOverride = "absent";
        break;
      case "mark_present":
        outcomeOverride = "present";
        break;
      case "excuse_lateness":
        latenessExcused = true;
        break;
    }
  }

  return { firstIn, lastOut, outcomeOverride, latenessExcused };
}
