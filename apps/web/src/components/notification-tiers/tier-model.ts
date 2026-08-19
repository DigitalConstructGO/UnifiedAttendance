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
