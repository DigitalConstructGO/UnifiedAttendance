import { sqliteEnum } from "./columns";

export const CLIENT_STATUSES = ["active", "archived"] as const;
export const CLIENT_PRIORITIES = ["low", "normal", "high", "critical"] as const;
export const OPPORTUNITY_PRIORITIES = ["low", "medium", "high"] as const;
export const PIPELINE_STAGE_OUTCOMES = ["open", "won", "lost"] as const;
export const PROJECT_STATUSES = ["planning", "in_progress", "completed", "cancelled"] as const;
export const COMMERCIAL_CONTRACT_STATUSES = [
  "draft",
  "active",
  "expired",
  "terminated",
  "cancelled",
] as const;
export const CONTRACT_RENEWAL_MODES = ["automatic", "manual", "none"] as const;
/** How the contract's amount is settled: everything up front, everything on completion, or half now. */
export const CONTRACT_PAYMENT_STRUCTURES = ["full", "prepaid", "half_upfront"] as const;
export const CLIENT_DOCUMENT_KINDS = [
  "contract",
  "proposal",
  "registration",
  "nda",
  "invoice",
] as const;
export const CLIENT_DOCUMENT_ACCESS_LEVELS = ["standard", "restricted"] as const;
export const CRM_ACTIVITY_TYPES = ["call", "meeting", "email", "site_visit"] as const;
export const AUDIT_ACTOR_TYPES = ["user", "system"] as const;

export const clientStatus = sqliteEnum("client_status", CLIENT_STATUSES);
export const clientPriority = sqliteEnum("client_priority", CLIENT_PRIORITIES);
export const opportunityPriority = sqliteEnum("opportunity_priority", OPPORTUNITY_PRIORITIES);
export const pipelineStageOutcome = sqliteEnum("pipeline_stage_outcome", PIPELINE_STAGE_OUTCOMES);
export const projectStatus = sqliteEnum("project_status", PROJECT_STATUSES);
export const commercialContractStatus = sqliteEnum(
  "commercial_contract_status",
  COMMERCIAL_CONTRACT_STATUSES,
);
export const contractRenewalMode = sqliteEnum("contract_renewal_mode", CONTRACT_RENEWAL_MODES);
export const contractPaymentStructure = sqliteEnum(
  "contract_payment_structure",
  CONTRACT_PAYMENT_STRUCTURES,
);
export const clientDocumentKind = sqliteEnum("client_document_kind", CLIENT_DOCUMENT_KINDS);
export const clientDocumentAccessLevel = sqliteEnum(
  "client_document_access_level",
  CLIENT_DOCUMENT_ACCESS_LEVELS,
);
export const crmActivityType = sqliteEnum("crm_activity_type", CRM_ACTIVITY_TYPES);
export const auditActorType = sqliteEnum("audit_actor_type", AUDIT_ACTOR_TYPES);
