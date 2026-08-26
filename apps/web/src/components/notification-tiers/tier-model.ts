import type { NotificationCondition } from "@/lib/api/notifications";

export type TierDraft = {
  id?: string;
  condition: NotificationCondition;
  threshold: number;
  subjectTemplate: string;
  bodyTemplate: string;
};

export function emptyTierDraft(condition: NotificationCondition): TierDraft {
  return { condition, threshold: 1, subjectTemplate: "", bodyTemplate: "" };
}

export const CONDITIONS: { id: NotificationCondition; label: string }[] = [
  { id: "late", label: "Late arrival" },
  { id: "absent", label: "Absence" },
];

export type Placeholder = { token: string; label: string };

const COMMON_PLACEHOLDERS: Placeholder[] = [
  { token: "{{employeeName}}", label: "Employee name" },
  { token: "{{date}}", label: "Date" },
  { token: "{{branchName}}", label: "Branch" },
];

/** The values each scan actually supplies; an unlisted token would print literally. */
const PLACEHOLDERS: Record<NotificationCondition, Placeholder[]> = {
  late: [
    ...COMMON_PLACEHOLDERS,
    { token: "{{lateMinutes}}", label: "Minutes late" },
    { token: "{{occurrenceCount}}", label: "Times this week" },
  ],
  absent: [...COMMON_PLACEHOLDERS, { token: "{{occurrenceCount}}", label: "Times this week" }],
};

export function placeholdersFor(condition: NotificationCondition): Placeholder[] {
  return PLACEHOLDERS[condition];
}

export type Cursor = { start: number; end: number };

/** Splices `token` over the selection (or at the end when the field has no cursor). */
export function insertPlaceholder(
  text: string,
  cursor: Cursor | null,
  token: string,
): { text: string; cursor: number } {
  const start = cursor?.start ?? text.length;
  const end = cursor?.end ?? text.length;
  return {
    text: text.slice(0, start) + token + text.slice(end),
    cursor: start + token.length,
  };
}
