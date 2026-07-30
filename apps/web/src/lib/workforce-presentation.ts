export const EMPLOYMENT_TYPES = ["permanent", "contract", "part_time", "intern"] as const;
export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];

export const EMPLOYEE_STATUSES = ["active", "suspended", "terminated"] as const;
export type EmployeeStatus = (typeof EMPLOYEE_STATUSES)[number];

export const ACTIVE_STATUSES = ["active", "inactive"] as const;
export type ActiveStatus = (typeof ACTIVE_STATUSES)[number];

export const EMPLOYMENT_CONTRACT_STATUSES = ["draft", "signed", "ended", "cancelled"] as const;
export type EmploymentContractStatus = (typeof EMPLOYMENT_CONTRACT_STATUSES)[number];

export const WORKFORCE_DOCUMENT_CONTENT_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
] as const;
export type WorkforceDocumentContentType = (typeof WORKFORCE_DOCUMENT_CONTENT_TYPES)[number];

export const ACTIVE_STATUS_META: Record<ActiveStatus, { label: string }> = {
  active: { label: "Active" },
  inactive: { label: "Inactive" },
};

export const EMPLOYMENT_TYPE_META: Record<
  EmploymentType,
  { label: string; scheduleLabel: string }
> = {
  permanent: { label: "Full-time", scheduleLabel: "Full-time schedule" },
  contract: { label: "Contract", scheduleLabel: "Contract schedule" },
  part_time: { label: "Part-time", scheduleLabel: "Part-time schedule" },
  intern: { label: "Intern", scheduleLabel: "Intern schedule" },
};

export const EMPLOYEE_STATUS_META: Record<EmployeeStatus, { label: string; badgeClass: string }> = {
  active: {
    label: "Active",
    badgeClass: "rounded-md bg-success/10 px-2 py-1 text-[0.6875rem] font-bold text-success",
  },
  suspended: {
    label: "Suspended",
    badgeClass: "rounded-md bg-warning/12 px-2 py-1 text-[0.6875rem] font-bold text-warning",
  },
  terminated: {
    label: "Terminated",
    badgeClass:
      "rounded-md bg-destructive/10 px-2 py-1 text-[0.6875rem] font-bold text-destructive",
  },
};

export const EMPLOYMENT_TRANSITION_STATUS_LABELS: Record<EmployeeStatus, string> = {
  active: "Active / transfer",
  suspended: "Suspend",
  terminated: "Terminate",
};

export const CONTRACT_STATUS_META: Record<
  EmploymentContractStatus,
  { label: string; badgeClass: string }
> = {
  draft: { label: "Draft", badgeClass: "bg-muted text-muted-foreground" },
  signed: { label: "Signed", badgeClass: "bg-success/10 text-success" },
  ended: { label: "Ended", badgeClass: "bg-workflow/10 text-workflow" },
  cancelled: { label: "Cancelled", badgeClass: "bg-destructive/10 text-destructive" },
};

export function employmentLabel(value: EmploymentType) {
  return EMPLOYMENT_TYPE_META[value].label;
}

export function employmentScheduleLabel(value: EmploymentType) {
  return EMPLOYMENT_TYPE_META[value].scheduleLabel;
}

export function contractRequiresSignedDate(status: EmploymentContractStatus) {
  return status === "signed" || status === "ended";
}
