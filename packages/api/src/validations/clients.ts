import { z } from "zod";

import {
  CLIENT_STATUSES,
  CLIENT_PRIORITIES,
  CLIENT_DOCUMENT_ACCESS_LEVELS,
  CLIENT_DOCUMENT_KINDS,
  COMMERCIAL_CONTRACT_STATUSES,
  CONTRACT_PAYMENT_STRUCTURES,
  CONTRACT_RENEWAL_MODES,
  OPPORTUNITY_PRIORITIES,
  PIPELINE_STAGE_OUTCOMES,
  PROJECT_STATUSES,
} from "@UnifiedAttendance/db/schema/client-enums";
import { ACTIVE_STATUSES } from "@UnifiedAttendance/db/schema/workforce-enums";
import { INVOICE_LIFECYCLE_STATUSES } from "@UnifiedAttendance/db/schema/client-billing";

import { date, id, nullableText, text } from "./shared";

export const clientResourceIdInput = z.object({ id });

export const createIndustryInput = z.object({ name: text });
export const createClientTypeInput = z.object({ name: text });

export const updateCatalogInput = z.object({
  id,
  name: text.optional(),
  status: z.enum(ACTIVE_STATUSES).optional(),
});
export const createPipelineStageInput = z.object({
  name: text,
  position: z.number().int().positive(),
  outcome: z.enum(PIPELINE_STAGE_OUTCOMES).default(PIPELINE_STAGE_OUTCOMES[0]),
});
export const updatePipelineStageInput = createPipelineStageInput.partial().extend({
  id,
  status: z.enum(ACTIVE_STATUSES).optional(),
});

const catalogName = z.string().trim().min(1).max(80);

export const createClientInput = z
  .object({
    branchId: id,
    ownerEmployeeId: id,
    legalName: text,
    tradingName: nullableText,
    industryId: id.optional(),
    industry: catalogName.optional(),
    clientTypeId: id.optional(),
    clientType: catalogName.optional(),
    phone: nullableText,
    email: z.email().nullable().optional(),
    tin: nullableText,
    vatNumber: nullableText,
    registrationNumber: nullableText,
    businessLicenseNumber: nullableText,
    relationshipStartedOn: date.optional(),
  })
  .refine((input) => input.industryId || input.industry, {
    path: ["industry"],
    message: "Industry is required",
  })
  .refine((input) => input.clientTypeId || input.clientType, {
    path: ["clientType"],
    message: "Client type is required",
  });

export const updateClientInput = z.object({
  id,
  branchId: id.optional(),
  ownerEmployeeId: id.optional(),
  legalName: text.optional(),
  tradingName: nullableText,
  industryId: id.optional(),
  industry: catalogName.optional(),
  clientTypeId: id.optional(),
  clientType: catalogName.optional(),
  phone: nullableText,
  email: z.email().nullable().optional(),
  tin: nullableText,
  vatNumber: nullableText,
  registrationNumber: nullableText,
  businessLicenseNumber: nullableText,
  relationshipStartedOn: date.optional(),
  priority: z.enum(CLIENT_PRIORITIES).nullable().optional(),
});

export const listClientsInput = z.object({
  search: z.string().trim().min(1).optional(),
  branchId: id.optional(),
  industryId: id.optional(),
  ownerEmployeeId: id.optional(),
  status: z.enum(CLIENT_STATUSES).optional(),
  directoryStatus: z
    .enum(["active_project", "completed", "recurring", "active", "archived"])
    .optional(),
  pipelineStageId: id.optional(),
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(100).optional(),
});

export const listClientContactsInput = z.object({
  clientId: id,
  includeInactive: z.stringbool().optional(),
});
export const createClientContactInput = z.object({
  clientId: id,
  firstName: text,
  lastName: text,
  role: nullableText,
  phone: nullableText,
  email: z.email().nullable().optional(),
  isPrimary: z.boolean().optional(),
});
export const updateClientContactInput = createClientContactInput
  .omit({ clientId: true })
  .partial()
  .extend({ id });

const MONEY_MESSAGE =
  "Enter the amount in digits only, like 6050 or 6050.50 — no commas or letters";

const optionalMoney = z
  .string()
  .regex(/^\d+(\.\d{1,2})?$/, MONEY_MESSAGE)
  .nullable()
  .optional();

export const createOpportunityInput = z.object({
  branchId: id,
  clientId: id.nullable().optional(),
  name: text,
  industryId: id.nullable().optional(),
  ownerEmployeeId: id,
  pipelineStageId: id,
  estimatedValue: optionalMoney,
  currency: nullableText,
  priority: z.enum(OPPORTUNITY_PRIORITIES).optional(),
});
export const updateOpportunityInput = z.object({
  id,
  branchId: id.optional(),
  name: text.optional(),
  industryId: id.nullable().optional(),
  ownerEmployeeId: id.optional(),
  estimatedValue: optionalMoney,
  currency: nullableText,
  priority: z.enum(OPPORTUNITY_PRIORITIES).optional(),
});
export const listOpportunitiesInput = z.object({
  branchId: id.optional(),
  clientId: id.optional(),
  ownerEmployeeId: id.optional(),
  pipelineStageId: id.optional(),
  includeClosed: z.stringbool().optional(),
  archived: z.stringbool().optional(),
});
export const transitionOpportunityStageInput = z.object({
  id,
  toPipelineStageId: id,
  occurredAt: z.coerce.date().optional(),
  note: nullableText,
});
export const convertOpportunityInput = z.object({
  id,
  clientId: id,
  toPipelineStageId: id.optional(),
  occurredAt: z.coerce.date().optional(),
});
export const listOpportunityStageTransitionsInput = z.object({ opportunityId: id });

export const createProjectInput = z.object({
  clientId: id,
  branchId: id,
  commercialContractId: id.nullable().optional(),
  name: text,
  managerEmployeeId: id,
  status: z.enum(PROJECT_STATUSES).optional(),
  startsOn: date.nullable().optional(),
  dueOn: date,
  completedOn: date.nullable().optional(),
});
export const updateProjectInput = createProjectInput
  .omit({ clientId: true })
  .partial()
  .extend({ id });
export const listProjectsInput = z.object({
  clientId: id.optional(),
  branchId: id.optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  includeArchived: z.stringbool().optional(),
});

export const createCommercialContractInput = z.object({
  clientId: id,
  opportunityId: id.nullable().optional(),
  serviceName: text,
  billingCadence: nullableText,
  startsOn: date,
  endsOn: date,
  renewalMode: z.enum(CONTRACT_RENEWAL_MODES).optional(),
  status: z.enum(COMMERCIAL_CONTRACT_STATUSES).optional(),
  signedOn: date.nullable().optional(),
  amount: optionalMoney,
  currency: nullableText,
  paymentStructure: z.enum(CONTRACT_PAYMENT_STRUCTURES).optional(),
});
export const updateCommercialContractInput = createCommercialContractInput
  .omit({ clientId: true })
  .partial()
  .extend({ id });
export const listCommercialContractsInput = z.object({
  clientId: id.optional(),
  opportunityId: id.optional(),
  status: z.enum(COMMERCIAL_CONTRACT_STATUSES).optional(),
});

const positiveMoney = z
  .string()
  .regex(
    /^(?!0+(\.0{1,2})?$)\d+(\.\d{1,2})?$/,
    "Enter an amount greater than zero in digits only, like 6050 or 6050.50 — no commas or letters",
  );

export const createInvoiceInput = z.object({
  clientId: id,
  projectId: id.nullable().optional(),
  commercialContractId: id.nullable().optional(),
  branchId: id,
  currency: text,
  totalAmount: positiveMoney,
  description: nullableText,
  note: nullableText,
});
export const updateInvoiceInput = z.object({
  id,
  projectId: id.nullable().optional(),
  commercialContractId: id.nullable().optional(),
  branchId: id.optional(),
  currency: text.optional(),
  totalAmount: positiveMoney.optional(),
  description: nullableText,
  note: nullableText,
});
export const issueInvoiceInput = z.object({ id, issuedOn: date, dueOn: date });
export const listInvoicesInput = z.object({
  clientId: id.optional(),
  branchId: id.optional(),
  lifecycleStatus: z.enum(INVOICE_LIFECYCLE_STATUSES).optional(),
  asOf: date.optional(),
});
export const recordInvoicePaymentInput = z.object({
  invoiceId: id,
  amount: positiveMoney,
  currency: text,
  paidOn: date,
  method: nullableText,
  reference: nullableText,
  recordedByEmployeeId: id,
});
export const updateInvoicePaymentInput = z.object({
  id,
  amount: positiveMoney.optional(),
  paidOn: date.optional(),
  method: nullableText,
  reference: nullableText,
});

export const createClientNoteInput = z.object({
  clientId: id,
  authorEmployeeId: id,
  body: text,
  isPinned: z.boolean().optional(),
});
export const updateClientNoteInput = z.object({
  id,
  body: text.optional(),
  isPinned: z.boolean().optional(),
});
export const listClientNotesInput = z.object({
  clientId: id,
  includeArchived: z.stringbool().optional(),
});
export const createCrmActivityInput = z.object({
  clientId: id,
  clientContactId: id.nullable().optional(),
  actorEmployeeId: id,
  note: text,
  contactDate: z.coerce.date(),
});
export const updateCrmActivityInput = z.object({
  id,
  note: text.optional(),
  contactDate: z.coerce.date().optional(),
  clientContactId: id.nullable().optional(),
});
export const listCrmActivitiesInput = z.object({
  clientId: id,
});

export const CLIENT_DOCUMENT_CONTENT_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;
const MAX_CLIENT_DOCUMENT_BYTES = 25 * 1024 * 1024;

export const createClientDocumentInput = z.object({
  clientId: id,
  commercialContractId: id.optional(),
  opportunityId: id.optional(),
  projectId: id.optional(),
  invoiceId: id.optional(),
  kind: z.enum(CLIENT_DOCUMENT_KINDS),
  fileName: text,
  contentType: z.enum(CLIENT_DOCUMENT_CONTENT_TYPES),
  contentLength: z.number().int().positive().max(MAX_CLIENT_DOCUMENT_BYTES),
  accessLevel: z.enum(CLIENT_DOCUMENT_ACCESS_LEVELS).optional(),
  uploadedByEmployeeId: id,
});
export const createClientDocumentVersionInput = z.object({
  logicalDocumentId: id,
  fileName: text,
  contentType: z.enum(CLIENT_DOCUMENT_CONTENT_TYPES),
  contentLength: z.number().int().positive().max(MAX_CLIENT_DOCUMENT_BYTES),
  accessLevel: z.enum(CLIENT_DOCUMENT_ACCESS_LEVELS).optional(),
  uploadedByEmployeeId: id,
});
export const listClientDocumentsInput = z.object({
  clientId: id,
  kind: z.enum(CLIENT_DOCUMENT_KINDS).optional(),
});
export const clientProjectionInput = z.object({ id, asOf: date.optional() });
export const clientOverviewInput = z
  .object({
    branchId: id.optional(),
    currency: text.optional(),
    revenueMeasure: z.enum(["invoiced", "collected"]).optional(),
    asOf: date.optional(),
    from: date.optional(),
    to: date.optional(),
  })
  .refine((input) => !input.from || !input.to || input.from <= input.to, {
    message: "Reporting start date cannot be after end date",
    path: ["to"],
  });

export type ClientResourceIdInput = z.output<typeof clientResourceIdInput>;
export type CreateIndustryInput = z.output<typeof createIndustryInput>;
export type CreateClientTypeInput = z.output<typeof createClientTypeInput>;
export type UpdateCatalogInput = z.output<typeof updateCatalogInput>;
export type CreatePipelineStageInput = z.output<typeof createPipelineStageInput>;
export type UpdatePipelineStageInput = z.output<typeof updatePipelineStageInput>;
export type CreateClientInput = z.output<typeof createClientInput>;
export type UpdateClientInput = z.output<typeof updateClientInput>;
export type ListClientsInput = z.output<typeof listClientsInput>;
export type ListClientContactsInput = z.output<typeof listClientContactsInput>;
export type CreateClientContactInput = z.output<typeof createClientContactInput>;
export type UpdateClientContactInput = z.output<typeof updateClientContactInput>;
export type CreateOpportunityInput = z.output<typeof createOpportunityInput>;
export type UpdateOpportunityInput = z.output<typeof updateOpportunityInput>;
export type ListOpportunitiesInput = z.output<typeof listOpportunitiesInput>;
export type TransitionOpportunityStageInput = z.output<typeof transitionOpportunityStageInput>;
export type ConvertOpportunityInput = z.output<typeof convertOpportunityInput>;
export type ListOpportunityStageTransitionsInput = z.output<
  typeof listOpportunityStageTransitionsInput
>;
export type CreateProjectInput = z.output<typeof createProjectInput>;
export type UpdateProjectInput = z.output<typeof updateProjectInput>;
export type ListProjectsInput = z.output<typeof listProjectsInput>;
export type CreateCommercialContractInput = z.output<typeof createCommercialContractInput>;
export type UpdateCommercialContractInput = z.output<typeof updateCommercialContractInput>;
export type ListCommercialContractsInput = z.output<typeof listCommercialContractsInput>;
export type CreateInvoiceInput = z.output<typeof createInvoiceInput>;
export type UpdateInvoiceInput = z.output<typeof updateInvoiceInput>;
export type IssueInvoiceInput = z.output<typeof issueInvoiceInput>;
export type ListInvoicesInput = z.output<typeof listInvoicesInput>;
export type RecordInvoicePaymentInput = z.output<typeof recordInvoicePaymentInput>;
export type UpdateInvoicePaymentInput = z.output<typeof updateInvoicePaymentInput>;
export type CreateClientNoteInput = z.output<typeof createClientNoteInput>;
export type UpdateClientNoteInput = z.output<typeof updateClientNoteInput>;
export type ListClientNotesInput = z.output<typeof listClientNotesInput>;
export type CreateCrmActivityInput = z.output<typeof createCrmActivityInput>;
export type UpdateCrmActivityInput = z.output<typeof updateCrmActivityInput>;
export type ListCrmActivitiesInput = z.output<typeof listCrmActivitiesInput>;
export type CreateClientDocumentInput = z.output<typeof createClientDocumentInput>;
export type CreateClientDocumentVersionInput = z.output<typeof createClientDocumentVersionInput>;
export type ListClientDocumentsInput = z.output<typeof listClientDocumentsInput>;
export type ClientProjectionInput = z.output<typeof clientProjectionInput>;
export type ClientOverviewInput = z.output<typeof clientOverviewInput>;
