import type { z } from "zod";
import type * as service from "@UnifiedAttendance/api/modules/clients/service";
import type * as validations from "@UnifiedAttendance/api/validations/clients";
import { CLIENT_DOCUMENT_CONTENT_TYPES } from "@UnifiedAttendance/api/validations/clients";

import { apiFetch, uploadToStorage, type JsonOf, type QueryParams } from "./client";

type Returned<T extends (...args: never[]) => unknown> = JsonOf<Awaited<ReturnType<T>>>;

export type ClientRow = Returned<typeof service.getClient>;
export type ClientList = Returned<typeof service.listClients>;
export type ClientContact = Returned<typeof service.listClientContacts>[number];
export type ClientOwnerAssignment = Returned<typeof service.listClientOwnerAssignments>[number];
export type OpportunityRow = Returned<typeof service.listOpportunities>[number];
export type OpportunityStageTransition = Returned<
  typeof service.listOpportunityStageTransitions
>[number];
export type ProjectRow = Returned<typeof service.listProjects>[number];
export type CommercialContractRow = Returned<typeof service.listCommercialContracts>[number];
export type Industry = Returned<typeof service.listIndustries>[number];
export type ClientType = Returned<typeof service.listClientTypes>[number];
export type PipelineStage = Returned<typeof service.listPipelineStages>[number];
export type ClientOverview = Returned<typeof service.getClientOverview>;
export type ClientProfile = Returned<typeof service.getClientProfile>;
export type RevenueReport = Returned<typeof service.getRevenueReport>;
export type ClientTimeline = Returned<typeof service.getClientTimeline>;
export type ClientAuditEntry = Returned<typeof service.listClientAuditEntries>[number];
export type InvoiceRow = Returned<typeof service.getInvoice>;
export type ClientNoteRow = Returned<typeof service.listClientNotes>[number];
export type CrmActivityRow = Returned<typeof service.listCrmActivities>[number];
export type ClientDocumentRow = Returned<typeof service.getClientDocument>;

type ListClientsQuery = z.input<typeof validations.listClientsInput>;
type ListOpportunitiesQuery = z.input<typeof validations.listOpportunitiesInput>;
type ListProjectsQuery = z.input<typeof validations.listProjectsInput>;
type ListCommercialContractsQuery = z.input<typeof validations.listCommercialContractsInput>;
type ListInvoicesQuery = z.input<typeof validations.listInvoicesInput>;
type ClientOverviewQuery = z.input<typeof validations.clientOverviewInput>;
type RevenueReportQuery = z.input<typeof validations.revenueReportInput>;
type ClientDocumentMetadata = Omit<
  z.input<typeof validations.createClientDocumentInput>,
  "fileName" | "contentType" | "contentLength"
>;
type ClientDocumentVersionMetadata = Omit<
  z.input<typeof validations.createClientDocumentVersionInput>,
  "fileName" | "contentType" | "contentLength"
>;

export const clientKeys = {
  all: ["clients"] as const,
  list: (query: ListClientsQuery) => ["clients", "list", query] as const,
  detail: (id: string) => ["clients", id] as const,
  overview: (query: ClientOverviewQuery) => ["clients", "overview", query] as const,
  profile: (id: string, asOf?: string) => ["clients", id, "profile", { asOf }] as const,
  timeline: (id: string, asOf?: string) => ["clients", id, "timeline", { asOf }] as const,
  revenue: (query: RevenueReportQuery = {}) => ["clients", "revenue", query] as const,
  audit: (id: string) => ["clients", id, "audit"] as const,
  ownerAssignments: (id: string) => ["clients", id, "owner-assignments"] as const,
  contacts: (clientId: string) => ["client-contacts", { clientId }] as const,
  contactsAll: ["client-contacts"] as const,
  opportunities: (query: ListOpportunitiesQuery) => ["opportunities", "list", query] as const,
  opportunitiesAll: ["opportunities"] as const,
  opportunity: (id: string) => ["opportunities", id] as const,
  stageTransitions: (opportunityId: string) =>
    ["opportunity-stage-transitions", { opportunityId }] as const,
  projects: (query: ListProjectsQuery) => ["client-projects", "list", query] as const,
  projectsAll: ["client-projects"] as const,
  project: (id: string) => ["client-projects", id] as const,
  commercialContracts: (query: ListCommercialContractsQuery) =>
    ["commercial-contracts", "list", query] as const,
  commercialContractsAll: ["commercial-contracts"] as const,
  commercialContract: (id: string) => ["commercial-contracts", id] as const,
  invoices: (query: ListInvoicesQuery) => ["invoices", "list", query] as const,
  invoicesAll: ["invoices"] as const,
  invoice: (id: string) => ["invoices", id] as const,
  notes: (clientId: string) => ["client-notes", { clientId }] as const,
  notesAll: ["client-notes"] as const,
  activities: (query: z.input<typeof validations.listCrmActivitiesInput>) =>
    ["crm-activities", query] as const,
  activitiesAll: ["crm-activities"] as const,
  documents: (clientId: string) => ["client-documents", { clientId }] as const,
  documentsAll: ["client-documents"] as const,
  industries: ["industries"] as const,
  clientTypes: ["client-types"] as const,
  pipelineStages: ["pipeline-stages"] as const,
};

export const clientsApi = {
  list: (query: ListClientsQuery = {}, signal?: AbortSignal) =>
    apiFetch<ClientList>("/clients", { query: query as QueryParams, signal }),
  get: (id: string, signal?: AbortSignal) => apiFetch<ClientRow>(`/clients/${id}`, { signal }),
  create: (input: z.input<typeof validations.createClientInput>) =>
    apiFetch<Returned<typeof service.createClient>>("/clients", { method: "POST", body: input }),
  update: ({ id, ...values }: z.input<typeof validations.updateClientInput>) =>
    apiFetch<Returned<typeof service.updateClient>>(`/clients/${id}`, {
      method: "PATCH",
      body: values,
    }),
  archive: (id: string) =>
    apiFetch<Returned<typeof service.archiveClient>>(`/clients/${id}`, { method: "DELETE" }),
  restore: (id: string) =>
    apiFetch<Returned<typeof service.restoreClient>>(`/clients/${id}/restore`, {
      method: "POST",
    }),
  deleteForever: (id: string) =>
    apiFetch<Returned<typeof service.deleteClient>>(`/clients/${id}/permanent`, {
      method: "DELETE",
    }),
  ownerAssignments: (id: string, signal?: AbortSignal) =>
    apiFetch<ClientOwnerAssignment[]>(`/clients/${id}/owner-assignments`, { signal }),
  overview: (query: ClientOverviewQuery = {}, signal?: AbortSignal) =>
    apiFetch<ClientOverview>("/clients/overview", {
      query: query as QueryParams,
      signal,
    }),
  profile: (id: string, asOf?: string, signal?: AbortSignal) =>
    apiFetch<ClientProfile>(`/clients/${id}/profile`, { query: { asOf }, signal }),
  timeline: (id: string, asOf?: string, signal?: AbortSignal) =>
    apiFetch<ClientTimeline>(`/clients/${id}/timeline`, { query: { asOf }, signal }),
  revenue: (query: RevenueReportQuery = {}, signal?: AbortSignal) =>
    apiFetch<RevenueReport>("/clients/revenue", { query: query as QueryParams, signal }),
  audit: (id: string, signal?: AbortSignal) =>
    apiFetch<ClientAuditEntry[]>(`/clients/${id}/audit`, { signal }),

  contacts: (query: z.input<typeof validations.listClientContactsInput>, signal?: AbortSignal) =>
    apiFetch<ClientContact[]>("/client-contacts", { query: query as QueryParams, signal }),
  createContact: (input: z.input<typeof validations.createClientContactInput>) =>
    apiFetch<ClientContact>("/client-contacts", { method: "POST", body: input }),
  updateContact: ({ id, ...values }: z.input<typeof validations.updateClientContactInput>) =>
    apiFetch<ClientContact>(`/client-contacts/${id}`, { method: "PATCH", body: values }),
  archiveContact: (id: string) =>
    apiFetch<ClientContact>(`/client-contacts/${id}`, { method: "DELETE" }),

  opportunities: (query: ListOpportunitiesQuery = {}, signal?: AbortSignal) =>
    apiFetch<OpportunityRow[]>("/opportunities", { query: query as QueryParams, signal }),
  opportunity: (id: string, signal?: AbortSignal) =>
    apiFetch<OpportunityRow>(`/opportunities/${id}`, { signal }),
  createOpportunity: (input: z.input<typeof validations.createOpportunityInput>) =>
    apiFetch<Returned<typeof service.createOpportunity>>("/opportunities", {
      method: "POST",
      body: input,
    }),
  updateOpportunity: ({ id, ...values }: z.input<typeof validations.updateOpportunityInput>) =>
    apiFetch<OpportunityRow>(`/opportunities/${id}`, {
      method: "PATCH",
      body: values,
    }),
  transitionStage: ({
    id,
    ...values
  }: z.input<typeof validations.transitionOpportunityStageInput>) =>
    apiFetch<Returned<typeof service.transitionOpportunityStage>>(`/opportunities/${id}/stage`, {
      method: "POST",
      body: values,
    }),
  convertOpportunity: ({ id, ...values }: z.input<typeof validations.convertOpportunityInput>) =>
    apiFetch<Returned<typeof service.convertOpportunity>>(`/opportunities/${id}/convert`, {
      method: "POST",
      body: values,
    }),
  archiveOpportunity: (id: string) =>
    apiFetch<OpportunityRow>(`/opportunities/${id}/archive`, { method: "POST" }),
  restoreOpportunity: (id: string) =>
    apiFetch<OpportunityRow>(`/opportunities/${id}/restore`, { method: "POST" }),
  deleteOpportunity: (id: string) =>
    apiFetch<Returned<typeof service.deleteOpportunity>>(`/opportunities/${id}`, {
      method: "DELETE",
    }),
  stageTransitions: (opportunityId: string, signal?: AbortSignal) =>
    apiFetch<OpportunityStageTransition[]>("/opportunity-stage-transitions", {
      query: { opportunityId },
      signal,
    }),

  projects: (query: ListProjectsQuery = {}, signal?: AbortSignal) =>
    apiFetch<ProjectRow[]>("/projects", { query: query as QueryParams, signal }),
  project: (id: string, signal?: AbortSignal) =>
    apiFetch<ProjectRow>(`/projects/${id}`, { signal }),
  createProject: (input: z.input<typeof validations.createProjectInput>) =>
    apiFetch<Returned<typeof service.createProject>>("/projects", { method: "POST", body: input }),
  updateProject: ({ id, ...values }: z.input<typeof validations.updateProjectInput>) =>
    apiFetch<Returned<typeof service.updateProject>>(`/projects/${id}`, {
      method: "PATCH",
      body: values,
    }),
  archiveProject: (id: string) =>
    apiFetch<Returned<typeof service.archiveProject>>(`/projects/${id}/archive`, {
      method: "POST",
    }),
  restoreProject: (id: string) =>
    apiFetch<Returned<typeof service.restoreProject>>(`/projects/${id}/restore`, {
      method: "POST",
    }),
  deleteProject: (id: string) =>
    apiFetch<Returned<typeof service.deleteProject>>(`/projects/${id}`, { method: "DELETE" }),

  commercialContracts: (query: ListCommercialContractsQuery = {}, signal?: AbortSignal) =>
    apiFetch<CommercialContractRow[]>("/commercial-contracts", {
      query: query as QueryParams,
      signal,
    }),
  commercialContract: (id: string, signal?: AbortSignal) =>
    apiFetch<CommercialContractRow>(`/commercial-contracts/${id}`, { signal }),
  createCommercialContract: (input: z.input<typeof validations.createCommercialContractInput>) =>
    apiFetch<Returned<typeof service.createCommercialContract>>("/commercial-contracts", {
      method: "POST",
      body: input,
    }),
  updateCommercialContract: ({
    id,
    ...values
  }: z.input<typeof validations.updateCommercialContractInput>) =>
    apiFetch<Returned<typeof service.updateCommercialContract>>(`/commercial-contracts/${id}`, {
      method: "PATCH",
      body: values,
    }),
  deleteCommercialContract: (id: string) =>
    apiFetch<Returned<typeof service.deleteCommercialContract>>(`/commercial-contracts/${id}`, {
      method: "DELETE",
    }),

  invoices: (query: ListInvoicesQuery = {}, signal?: AbortSignal) =>
    apiFetch<InvoiceRow[]>("/invoices", { query: query as QueryParams, signal }),
  invoice: (id: string, signal?: AbortSignal) =>
    apiFetch<InvoiceRow>(`/invoices/${id}`, { signal }),
  createInvoice: (input: z.input<typeof validations.createInvoiceInput>) =>
    apiFetch<InvoiceRow>("/invoices", { method: "POST", body: input }),
  updateInvoice: ({ id, ...values }: z.input<typeof validations.updateInvoiceInput>) =>
    apiFetch<InvoiceRow>(`/invoices/${id}`, { method: "PATCH", body: values }),
  issueInvoice: ({ id, ...values }: z.input<typeof validations.issueInvoiceInput>) =>
    apiFetch<InvoiceRow>(`/invoices/${id}/issue`, { method: "POST", body: values }),
  voidInvoice: (id: string) => apiFetch<InvoiceRow>(`/invoices/${id}/void`, { method: "POST" }),
  deleteInvoice: (id: string) =>
    apiFetch<Returned<typeof service.deleteInvoice>>(`/invoices/${id}`, { method: "DELETE" }),
  recordInvoicePayment: (input: z.input<typeof validations.recordInvoicePaymentInput>) =>
    apiFetch<Returned<typeof service.recordInvoicePayment>>("/invoice-payments", {
      method: "POST",
      body: input,
    }),
  updateInvoicePayment: ({
    id,
    ...values
  }: z.input<typeof validations.updateInvoicePaymentInput>) =>
    apiFetch<Returned<typeof service.updateInvoicePayment>>(`/invoice-payments/${id}`, {
      method: "PATCH",
      body: values,
    }),
  archiveInvoicePayment: (id: string) =>
    apiFetch<Returned<typeof service.archiveInvoicePayment>>(`/invoice-payments/${id}/archive`, {
      method: "POST",
    }),
  deleteInvoicePayment: (id: string) =>
    apiFetch<Returned<typeof service.deleteInvoicePayment>>(`/invoice-payments/${id}`, {
      method: "DELETE",
    }),

  notes: (query: z.input<typeof validations.listClientNotesInput>, signal?: AbortSignal) =>
    apiFetch<ClientNoteRow[]>("/client-notes", {
      query: query as QueryParams,
      signal,
    }),
  createNote: (input: z.input<typeof validations.createClientNoteInput>) =>
    apiFetch<Returned<typeof service.createClientNote>>("/client-notes", {
      method: "POST",
      body: input,
    }),
  updateNote: ({ id, ...values }: z.input<typeof validations.updateClientNoteInput>) =>
    apiFetch<Returned<typeof service.updateClientNote>>(`/client-notes/${id}`, {
      method: "PATCH",
      body: values,
    }),
  archiveNote: (id: string) =>
    apiFetch<Returned<typeof service.archiveClientNote>>(`/client-notes/${id}`, {
      method: "DELETE",
    }),

  activities: (query: z.input<typeof validations.listCrmActivitiesInput>, signal?: AbortSignal) =>
    apiFetch<CrmActivityRow[]>("/crm-activities", {
      query: query as QueryParams,
      signal,
    }),
  createActivity: (input: z.input<typeof validations.createCrmActivityInput>) =>
    apiFetch<CrmActivityRow>("/crm-activities", { method: "POST", body: input }),
  updateActivity: ({ id, ...values }: z.input<typeof validations.updateCrmActivityInput>) =>
    apiFetch<CrmActivityRow>(`/crm-activities/${id}`, {
      method: "PATCH",
      body: values,
    }),
  deleteActivity: (id: string) =>
    apiFetch<Returned<typeof service.deleteCrmActivity>>(`/crm-activities/${id}`, {
      method: "DELETE",
    }),

  documents: (query: z.input<typeof validations.listClientDocumentsInput>, signal?: AbortSignal) =>
    apiFetch<ClientDocumentRow[]>("/client-documents", {
      query: query as QueryParams,
      signal,
    }),
  document: (id: string, signal?: AbortSignal) =>
    apiFetch<ClientDocumentRow & { downloadUrl: string }>(`/client-documents/${id}`, {
      signal,
    }),
  deleteDocument: (id: string) =>
    apiFetch<Returned<typeof service.deleteClientDocument>>(`/client-documents/${id}`, {
      method: "DELETE",
    }),
  uploadDocument: async (metadata: ClientDocumentMetadata, file: File) => {
    const contentType = CLIENT_DOCUMENT_CONTENT_TYPES.find((value) => value === file.type);
    if (!contentType) {
      throw new Error(`${file.name} must be a PDF, JPG, PNG, or WebP file.`);
    }
    const prepared = await apiFetch<
      ClientDocumentRow & { uploadUrl: string; uploadFields: Record<string, string> }
    >("/client-documents", {
      method: "POST",
      body: {
        ...metadata,
        fileName: file.name,
        contentType,
        contentLength: file.size,
      },
    });
    try {
      await uploadToStorage(prepared.uploadUrl, prepared.uploadFields, file);
    } catch (cause) {
      try {
        await clientsApi.deleteDocument(prepared.document.id);
      } catch (cleanupCause) {
        throw new AggregateError(
          [cause, cleanupCause],
          `Uploading ${file.name} failed and its prepared record could not be removed.`,
          { cause: cleanupCause },
        );
      }
      throw cause;
    }
    return prepared;
  },
  uploadDocumentVersion: async (metadata: ClientDocumentVersionMetadata, file: File) => {
    const contentType = CLIENT_DOCUMENT_CONTENT_TYPES.find((value) => value === file.type);
    if (!contentType) {
      throw new Error(`${file.name} must be a PDF, JPG, PNG, or WebP file.`);
    }
    const prepared = await apiFetch<
      ClientDocumentRow & { uploadUrl: string; uploadFields: Record<string, string> }
    >("/client-document-versions", {
      method: "POST",
      body: {
        ...metadata,
        fileName: file.name,
        contentType,
        contentLength: file.size,
      },
    });
    await uploadToStorage(prepared.uploadUrl, prepared.uploadFields, file);
    return prepared;
  },

  industries: (signal?: AbortSignal) => apiFetch<Industry[]>("/industries", { signal }),
  createIndustry: (input: z.input<typeof validations.createIndustryInput>) =>
    apiFetch<Industry>("/industries", { method: "POST", body: input }),
  updateIndustry: ({ id, ...values }: z.input<typeof validations.updateCatalogInput>) =>
    apiFetch<Industry>(`/industries/${id}`, { method: "PATCH", body: values }),
  clientTypes: (signal?: AbortSignal) => apiFetch<ClientType[]>("/client-types", { signal }),
  createClientType: (input: z.input<typeof validations.createClientTypeInput>) =>
    apiFetch<ClientType>("/client-types", { method: "POST", body: input }),
  updateClientType: ({ id, ...values }: z.input<typeof validations.updateCatalogInput>) =>
    apiFetch<ClientType>(`/client-types/${id}`, { method: "PATCH", body: values }),
  pipelineStages: (signal?: AbortSignal) =>
    apiFetch<PipelineStage[]>("/pipeline-stages", { signal }),
  createPipelineStage: (input: z.input<typeof validations.createPipelineStageInput>) =>
    apiFetch<PipelineStage>("/pipeline-stages", { method: "POST", body: input }),
  updatePipelineStage: ({ id, ...values }: z.input<typeof validations.updatePipelineStageInput>) =>
    apiFetch<PipelineStage>(`/pipeline-stages/${id}`, { method: "PATCH", body: values }),
};
