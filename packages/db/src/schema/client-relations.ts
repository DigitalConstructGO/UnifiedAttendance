import { relations } from "drizzle-orm";

import { user } from "./auth";
import { branches, organizations } from "./organization";
import { employees } from "./employees";
import {
  clientContacts,
  clientOwnerAssignments,
  clientTypes,
  clients,
  companySizes,
  industries,
  pipelineStages,
} from "./clients";
import { opportunities, opportunityStageTransitions } from "./client-sales";
import { commercialContracts } from "./client-contracts";
import { projects } from "./client-projects";
import { invoicePayments, invoices } from "./client-billing";
import { clientDocuments } from "./client-documents";
import { clientAuditEntries, clientNotes, crmActivities } from "./client-engagement";

export const industriesRelations = relations(industries, ({ many, one }) => ({
  organization: one(organizations, {
    fields: [industries.organizationId],
    references: [organizations.id],
  }),
  clients: many(clients),
  opportunities: many(opportunities),
}));

export const clientTypesRelations = relations(clientTypes, ({ many, one }) => ({
  organization: one(organizations, {
    fields: [clientTypes.organizationId],
    references: [organizations.id],
  }),
  clients: many(clients),
}));

export const companySizesRelations = relations(companySizes, ({ many, one }) => ({
  organization: one(organizations, {
    fields: [companySizes.organizationId],
    references: [organizations.id],
  }),
  clients: many(clients),
}));

export const pipelineStagesRelations = relations(pipelineStages, ({ many, one }) => ({
  organization: one(organizations, {
    fields: [pipelineStages.organizationId],
    references: [organizations.id],
  }),
  opportunities: many(opportunities),
  fromTransitions: many(opportunityStageTransitions, { relationName: "pipeline_stage_from" }),
  toTransitions: many(opportunityStageTransitions, { relationName: "pipeline_stage_to" }),
}));

export const clientsRelations = relations(clients, ({ many, one }) => ({
  organization: one(organizations, {
    fields: [clients.organizationId],
    references: [organizations.id],
  }),
  branch: one(branches, { fields: [clients.branchId], references: [branches.id] }),
  owner: one(employees, { fields: [clients.ownerEmployeeId], references: [employees.id] }),
  industry: one(industries, { fields: [clients.industryId], references: [industries.id] }),
  clientType: one(clientTypes, { fields: [clients.clientTypeId], references: [clientTypes.id] }),
  companySize: one(companySizes, {
    fields: [clients.companySizeId],
    references: [companySizes.id],
  }),
  contacts: many(clientContacts),
  ownerAssignments: many(clientOwnerAssignments),
  opportunities: many(opportunities),
  projects: many(projects),
  commercialContracts: many(commercialContracts),
  documents: many(clientDocuments),
  notes: many(clientNotes),
  invoices: many(invoices),
  activities: many(crmActivities),
  auditEntries: many(clientAuditEntries),
}));

export const clientContactsRelations = relations(clientContacts, ({ many, one }) => ({
  organization: one(organizations, {
    fields: [clientContacts.organizationId],
    references: [organizations.id],
  }),
  client: one(clients, { fields: [clientContacts.clientId], references: [clients.id] }),
  activities: many(crmActivities),
}));

export const clientOwnerAssignmentsRelations = relations(clientOwnerAssignments, ({ one }) => ({
  organization: one(organizations, {
    fields: [clientOwnerAssignments.organizationId],
    references: [organizations.id],
  }),
  client: one(clients, {
    fields: [clientOwnerAssignments.clientId],
    references: [clients.id],
  }),
  owner: one(employees, {
    fields: [clientOwnerAssignments.ownerEmployeeId],
    references: [employees.id],
  }),
  assignedBy: one(user, {
    fields: [clientOwnerAssignments.assignedByUserId],
    references: [user.id],
  }),
}));

export const opportunitiesRelations = relations(opportunities, ({ many, one }) => ({
  organization: one(organizations, {
    fields: [opportunities.organizationId],
    references: [organizations.id],
  }),
  branch: one(branches, { fields: [opportunities.branchId], references: [branches.id] }),
  client: one(clients, { fields: [opportunities.clientId], references: [clients.id] }),
  industry: one(industries, { fields: [opportunities.industryId], references: [industries.id] }),
  owner: one(employees, { fields: [opportunities.ownerEmployeeId], references: [employees.id] }),
  pipelineStage: one(pipelineStages, {
    fields: [opportunities.pipelineStageId],
    references: [pipelineStages.id],
  }),
  stageTransitions: many(opportunityStageTransitions),
  activities: many(crmActivities),
  commercialContracts: many(commercialContracts),
  documents: many(clientDocuments),
}));

export const opportunityStageTransitionsRelations = relations(
  opportunityStageTransitions,
  ({ one }) => ({
    organization: one(organizations, {
      fields: [opportunityStageTransitions.organizationId],
      references: [organizations.id],
    }),
    opportunity: one(opportunities, {
      fields: [opportunityStageTransitions.opportunityId],
      references: [opportunities.id],
    }),
    fromPipelineStage: one(pipelineStages, {
      relationName: "pipeline_stage_from",
      fields: [opportunityStageTransitions.fromPipelineStageId],
      references: [pipelineStages.id],
    }),
    toPipelineStage: one(pipelineStages, {
      relationName: "pipeline_stage_to",
      fields: [opportunityStageTransitions.toPipelineStageId],
      references: [pipelineStages.id],
    }),
    changedBy: one(user, {
      fields: [opportunityStageTransitions.changedByUserId],
      references: [user.id],
    }),
  }),
);

export const commercialContractsRelations = relations(commercialContracts, ({ many, one }) => ({
  organization: one(organizations, {
    fields: [commercialContracts.organizationId],
    references: [organizations.id],
  }),
  client: one(clients, { fields: [commercialContracts.clientId], references: [clients.id] }),
  opportunity: one(opportunities, {
    fields: [commercialContracts.opportunityId],
    references: [opportunities.id],
  }),
  projects: many(projects),
  invoices: many(invoices),
  documents: many(clientDocuments),
}));

export const projectsRelations = relations(projects, ({ many, one }) => ({
  organization: one(organizations, {
    fields: [projects.organizationId],
    references: [organizations.id],
  }),
  client: one(clients, { fields: [projects.clientId], references: [clients.id] }),
  branch: one(branches, { fields: [projects.branchId], references: [branches.id] }),
  commercialContract: one(commercialContracts, {
    fields: [projects.commercialContractId],
    references: [commercialContracts.id],
  }),
  manager: one(employees, { fields: [projects.managerEmployeeId], references: [employees.id] }),
  invoices: many(invoices),
  documents: many(clientDocuments),
}));

export const invoicesRelations = relations(invoices, ({ many, one }) => ({
  organization: one(organizations, {
    fields: [invoices.organizationId],
    references: [organizations.id],
  }),
  client: one(clients, { fields: [invoices.clientId], references: [clients.id] }),
  project: one(projects, { fields: [invoices.projectId], references: [projects.id] }),
  commercialContract: one(commercialContracts, {
    fields: [invoices.commercialContractId],
    references: [commercialContracts.id],
  }),
  branch: one(branches, { fields: [invoices.branchId], references: [branches.id] }),
  payments: many(invoicePayments),
  documents: many(clientDocuments),
}));

export const invoicePaymentsRelations = relations(invoicePayments, ({ one }) => ({
  organization: one(organizations, {
    fields: [invoicePayments.organizationId],
    references: [organizations.id],
  }),
  invoice: one(invoices, { fields: [invoicePayments.invoiceId], references: [invoices.id] }),
  recordedBy: one(employees, {
    fields: [invoicePayments.recordedByEmployeeId],
    references: [employees.id],
  }),
}));

export const clientDocumentsRelations = relations(clientDocuments, ({ one }) => ({
  organization: one(organizations, {
    fields: [clientDocuments.organizationId],
    references: [organizations.id],
  }),
  client: one(clients, { fields: [clientDocuments.clientId], references: [clients.id] }),
  commercialContract: one(commercialContracts, {
    fields: [clientDocuments.commercialContractId],
    references: [commercialContracts.id],
  }),
  opportunity: one(opportunities, {
    fields: [clientDocuments.opportunityId],
    references: [opportunities.id],
  }),
  project: one(projects, { fields: [clientDocuments.projectId], references: [projects.id] }),
  invoice: one(invoices, { fields: [clientDocuments.invoiceId], references: [invoices.id] }),
  uploadedBy: one(employees, {
    fields: [clientDocuments.uploadedByEmployeeId],
    references: [employees.id],
  }),
}));

export const clientNotesRelations = relations(clientNotes, ({ one }) => ({
  organization: one(organizations, {
    fields: [clientNotes.organizationId],
    references: [organizations.id],
  }),
  client: one(clients, { fields: [clientNotes.clientId], references: [clients.id] }),
  author: one(employees, { fields: [clientNotes.authorEmployeeId], references: [employees.id] }),
}));

export const crmActivitiesRelations = relations(crmActivities, ({ one }) => ({
  organization: one(organizations, {
    fields: [crmActivities.organizationId],
    references: [organizations.id],
  }),
  client: one(clients, { fields: [crmActivities.clientId], references: [clients.id] }),
  opportunity: one(opportunities, {
    fields: [crmActivities.opportunityId],
    references: [opportunities.id],
  }),
  clientContact: one(clientContacts, {
    fields: [crmActivities.clientContactId],
    references: [clientContacts.id],
  }),
  actor: one(employees, { fields: [crmActivities.actorEmployeeId], references: [employees.id] }),
}));

export const clientAuditEntriesRelations = relations(clientAuditEntries, ({ one }) => ({
  organization: one(organizations, {
    fields: [clientAuditEntries.organizationId],
    references: [organizations.id],
  }),
  client: one(clients, { fields: [clientAuditEntries.clientId], references: [clients.id] }),
  actorUser: one(user, { fields: [clientAuditEntries.actorUserId], references: [user.id] }),
}));
