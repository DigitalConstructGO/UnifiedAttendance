import type { Branch } from "@/lib/api/organization";
import { detectedTimeZone, WEEKDAY_NAMES } from "@/lib/timezone";

export type WorkspaceTab = "overview" | "branches" | "schedule" | "holidays";

export type BranchDraft = Pick<Branch, "name" | "code" | "timezone"> & {
  id?: string;
  address: string;
};

export function emptyBranchDraft(timezone = detectedTimeZone()): BranchDraft {
  return {
    name: "",
    code: "",
    address: "",
    timezone,
  };
}

export const WORKSPACE_TABS: { id: WorkspaceTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "branches", label: "Branches" },
  { id: "schedule", label: "Schedules" },
  { id: "holidays", label: "Holidays" },
];

export const WEEK = WEEKDAY_NAMES;
