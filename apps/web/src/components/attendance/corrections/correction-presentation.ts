import { CalendarX2, Clock, LogIn, LogOut, ShieldCheck, Timer, UserCheck } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { Correction } from "@/lib/api";

export type CorrectionType = Correction["type"];

/**
 * Four of the seven types state a time; the other three state an outcome. The
 * form and the ledger both branch on that, so it is recorded once here rather
 * than re-listed at each call site — and it mirrors the
 * attendance_corrections_time_required check constraint exactly.
 */
export const CORRECTION_TYPE_META: Record<
  CorrectionType,
  { label: string; hint: string; icon: LucideIcon; needsTime: boolean }
> = {
  add_check_in: {
    label: "Add check-in",
    hint: "They worked but no check-in was recorded.",
    icon: LogIn,
    needsTime: true,
  },
  add_check_out: {
    label: "Add check-out",
    hint: "They left but no check-out was recorded.",
    icon: LogOut,
    needsTime: true,
  },
  adjust_check_in: {
    label: "Adjust check-in",
    hint: "A check-in exists but the time is wrong.",
    icon: Clock,
    needsTime: true,
  },
  adjust_check_out: {
    label: "Adjust check-out",
    hint: "A check-out exists but the time is wrong.",
    icon: Timer,
    needsTime: true,
  },
  mark_present: {
    label: "Mark present",
    hint: "Count the day as worked without punch times.",
    icon: UserCheck,
    needsTime: false,
  },
  mark_absent: {
    label: "Mark absent",
    hint: "Discard the day's punches and record an absence.",
    icon: CalendarX2,
    needsTime: false,
  },
  excuse_lateness: {
    label: "Excuse lateness",
    hint: "Keep the times but stop counting the minutes late.",
    icon: ShieldCheck,
    needsTime: false,
  },
};

export const CORRECTION_TYPES = Object.keys(CORRECTION_TYPE_META) as CorrectionType[];

export function needsProposedTime(type: CorrectionType) {
  return CORRECTION_TYPE_META[type].needsTime;
}

/** Most missed punches are the morning one, so the picker opens at the hour it usually was. */
export const DEFAULT_PROPOSED_TIME = "09:00:00";
