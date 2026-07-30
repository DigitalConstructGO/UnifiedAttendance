import type { Branch } from "@/lib/api/organization";

export type WorkspaceTab = "overview" | "branches" | "schedule" | "holidays";

export type BranchDraft = Pick<Branch, "name" | "code"> & {
  id?: string;
  address: string;
};

export const EMPTY_BRANCH_DRAFT: BranchDraft = {
  name: "",
  code: "",
  address: "",
};

export const WORKSPACE_TABS: { id: WorkspaceTab; label: string }[] = [
  { id: "overview", label: "Overview" },
  { id: "branches", label: "Branches" },
  { id: "schedule", label: "Schedules" },
  { id: "holidays", label: "Holidays" },
];

export const WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
