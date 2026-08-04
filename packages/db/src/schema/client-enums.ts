import { pgEnum } from "drizzle-orm/pg-core";

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

export const clientStatus = pgEnum("client_status", CLIENT_STATUSES);
export const clientPriority = pgEnum("client_priority", CLIENT_PRIORITIES);
export const opportunityPriority = pgEnum("opportunity_priority", OPPORTUNITY_PRIORITIES);
export const pipelineStageOutcome = pgEnum("pipeline_stage_outcome", PIPELINE_STAGE_OUTCOMES);
export const projectStatus = pgEnum("project_status", PROJECT_STATUSES);
export const commercialContractStatus = pgEnum(
  "commercial_contract_status",
  COMMERCIAL_CONTRACT_STATUSES,
);
export const contractRenewalMode = pgEnum("contract_renewal_mode", CONTRACT_RENEWAL_MODES);
export const clientDocumentKind = pgEnum("client_document_kind", CLIENT_DOCUMENT_KINDS);
export const clientDocumentAccessLevel = pgEnum(
  "client_document_access_level",
  CLIENT_DOCUMENT_ACCESS_LEVELS,
);
export const crmActivityType = pgEnum("crm_activity_type", CRM_ACTIVITY_TYPES);
export const auditActorType = pgEnum("audit_actor_type", AUDIT_ACTOR_TYPES);
