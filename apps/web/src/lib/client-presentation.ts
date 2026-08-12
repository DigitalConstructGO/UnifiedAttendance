export const CLIENT_STATUSES = ["active", "archived"] as const;
export type ClientStatus = (typeof CLIENT_STATUSES)[number];

export const CLIENT_PRIORITIES = ["low", "normal", "high", "critical"] as const;
export type ClientPriority = (typeof CLIENT_PRIORITIES)[number];

export const OPPORTUNITY_PRIORITIES = ["low", "medium", "high"] as const;
export type OpportunityPriority = (typeof OPPORTUNITY_PRIORITIES)[number];

export const PROJECT_STATUSES = ["planning", "in_progress", "completed", "cancelled"] as const;
export type ProjectStatus = (typeof PROJECT_STATUSES)[number];

export const COMMERCIAL_CONTRACT_STATUSES = [
  "draft",
  "active",
  "expired",
  "terminated",
  "cancelled",
] as const;
export type CommercialContractStatus = (typeof COMMERCIAL_CONTRACT_STATUSES)[number];

export const CONTRACT_RENEWAL_MODES = ["automatic", "manual", "none"] as const;
export type ContractRenewalMode = (typeof CONTRACT_RENEWAL_MODES)[number];

export const CONTRACT_PAYMENT_STRUCTURES = ["full", "prepaid", "half_upfront"] as const;
export type ContractPaymentStructure = (typeof CONTRACT_PAYMENT_STRUCTURES)[number];

export const CRM_ACTIVITY_TYPES = ["call", "meeting", "email", "site_visit"] as const;
export type CrmActivityType = (typeof CRM_ACTIVITY_TYPES)[number];

export const CLIENT_DOCUMENT_KINDS = [
  "contract",
  "proposal",
  "registration",
  "nda",
  "invoice",
] as const;
export type ClientDocumentKind = (typeof CLIENT_DOCUMENT_KINDS)[number];

type Tone = { label: string; className: string };

export const PROJECT_STATUS_META = {
  planning: { label: "Planning", className: "text-workflow" },
  in_progress: { label: "In progress", className: "text-success" },
  completed: { label: "Completed", className: "text-info" },
  cancelled: { label: "Cancelled", className: "text-muted-foreground" },
} as const satisfies Record<ProjectStatus, Tone>;

export const PROJECT_PROGRESS_TONE = {
  planning: "bg-workflow",
  in_progress: "bg-success",
  completed: "bg-info",
  cancelled: "bg-muted-foreground",
} as const satisfies Record<ProjectStatus, string>;

export const CLIENT_PRIORITY_META = {
  low: { label: "Low", className: "bg-muted text-muted-foreground" },
  normal: { label: "Normal", className: "bg-info/10 text-info" },
  high: { label: "High", className: "bg-warning/15 text-amber-700 dark:text-warning" },
  critical: { label: "Critical", className: "bg-destructive/10 text-destructive" },
} as const satisfies Record<ClientPriority, Tone>;

export const OPPORTUNITY_PRIORITY_META = {
  low: { label: "Low", className: "bg-muted text-muted-foreground" },
  medium: { label: "Medium", className: "bg-workflow/10 text-workflow" },
  high: { label: "High", className: "bg-warning/15 text-amber-700 dark:text-warning" },
} as const satisfies Record<OpportunityPriority, Tone>;

export const CONTRACT_STATUS_META = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  active: { label: "Active", className: "bg-success/10 text-success" },
  expired: { label: "Expired", className: "bg-warning/15 text-amber-700 dark:text-warning" },
  terminated: { label: "Terminated", className: "bg-destructive/10 text-destructive" },
  cancelled: { label: "Cancelled", className: "bg-muted text-muted-foreground" },
} as const satisfies Record<CommercialContractStatus, Tone>;

export const RENEWAL_MODE_LABELS = {
  automatic: "Auto",
  manual: "Manual",
  none: "None",
} as const satisfies Record<ContractRenewalMode, string>;

export const PAYMENT_STRUCTURE_LABELS = {
  full: "Paid in full",
  prepaid: "Prepaid",
  half_upfront: "Half upfront",
} as const satisfies Record<ContractPaymentStructure, string>;

export const CLIENT_STATUS_META = {
  active: { label: "Active", className: "bg-success/10 text-success" },
  archived: { label: "Archived", className: "bg-muted text-muted-foreground" },
} as const satisfies Record<ClientStatus, Tone>;

export function directoryStatusTone(kind: string, label?: string): Tone {
  switch (kind) {
    case "active_project":
      return { label: label ?? "Active project", className: "bg-success/10 text-success" };
    case "completed":
      return { label: label ?? "Completed", className: "bg-info/10 text-info" };
    case "recurring":
      return { label: label ?? "Recurring", className: "bg-success/10 text-success" };
    case "pipeline_stage":
      return { label: label ?? "Pipeline", className: "bg-workflow/10 text-workflow" };
    case "archived":
      return CLIENT_STATUS_META.archived;
    default:
      return CLIENT_STATUS_META.active;
  }
}

const INDUSTRY_DOT_TONES = [
  "bg-warning",
  "bg-workflow",
  "bg-success",
  "bg-info",
  "bg-destructive",
] as const;

export function industryTone(name: string) {
  const seed = Array.from(name).reduce((total, character) => total + character.charCodeAt(0), 0);
  return INDUSTRY_DOT_TONES[seed % INDUSTRY_DOT_TONES.length]!;
}

export const ACTIVITY_TYPE_LABELS = {
  call: "Call",
  meeting: "Meeting",
  email: "Email",
  site_visit: "Site visit",
} as const satisfies Record<CrmActivityType, string>;

export const DOCUMENT_KIND_LABELS = {
  contract: "Contract",
  proposal: "Proposal",
  registration: "Registration",
  nda: "NDA",
  invoice: "Invoice",
} as const satisfies Record<ClientDocumentKind, string>;

export function normalizeAmount(raw: FormDataEntryValue | null) {
  return String(raw ?? "").replace(/[,\s]/g, "");
}

export function money(amount: string | number | null | undefined, currency = "ETB") {
  if (amount === null || amount === undefined || amount === "") return "—";
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(value)) return "—";
  return `${new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value)} ${currency}`;
}

export function exactMoney(amount: string | number, currency: string) {
  const value = typeof amount === "string" ? Number(amount) : amount;
  if (Number.isNaN(value)) return `${amount} ${currency}`;
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
  return `${formatted} ${currency}`;
}

export function fileSize(bytes: number | null | undefined) {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function initials(name: string) {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return "?";
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return `${words[0]![0]}${words[1]![0]}`.toUpperCase();
}

export function personName(person: { firstName: string; lastName: string }) {
  return `${person.firstName} ${person.lastName}`.trim();
}

export function clientName(client: { legalName: string; tradingName: string | null }) {
  return client.tradingName || client.legalName;
}
