import { queryOptions } from "@tanstack/react-query";

import { accessApi, accessKeys } from "./access";
import { attendanceApi, attendanceKeys } from "./attendance";
import { clientKeys, clientsApi } from "./clients";
import { correctionsApi, correctionsKeys } from "./corrections";
import { devicesApi, devicesKeys } from "./devices";
import { organizationApi, organizationKeys } from "./organization";
import { workforceApi, workforceKeys } from "./workforce";

const CATALOG_STALE_TIME = 5 * 60 * 1000;

export const accessQueries = {
  me: () =>
    queryOptions({
      queryKey: accessKeys.me,
      queryFn: ({ signal }) => accessApi.me(signal),
    }),
  permissions: () =>
    queryOptions({
      queryKey: accessKeys.permissions,
      queryFn: ({ signal }) => accessApi.permissions(signal),
      staleTime: CATALOG_STALE_TIME,
    }),
  roles: () =>
    queryOptions({
      queryKey: accessKeys.roles,
      queryFn: ({ signal }) => accessApi.roles(signal),
      staleTime: CATALOG_STALE_TIME,
    }),
  assignments: () =>
    queryOptions({
      queryKey: accessKeys.assignments,
      queryFn: ({ signal }) => accessApi.assignments(signal),
    }),
};

export const organizationQueries = {
  organization: () =>
    queryOptions({
      queryKey: organizationKeys.organization,
      queryFn: ({ signal }) => organizationApi.get(signal),
    }),
  branches: () =>
    queryOptions({
      queryKey: organizationKeys.branches,
      queryFn: ({ signal }) => organizationApi.branches(signal),
      staleTime: CATALOG_STALE_TIME,
    }),
  branch: (branchId: string) =>
    queryOptions({
      queryKey: organizationKeys.branch(branchId),
      queryFn: ({ signal }) => organizationApi.branch(branchId, signal),
      enabled: branchId.length > 0,
    }),
  workingDays: (branchId: string) =>
    queryOptions({
      queryKey: organizationKeys.workingDays(branchId),
      queryFn: ({ signal }) => organizationApi.workingDays(branchId, signal),
      enabled: branchId.length > 0,
    }),
  holidays: (branchId?: string | null) =>
    queryOptions({
      queryKey: organizationKeys.holidays(branchId),
      queryFn: ({ signal }) => organizationApi.holidays(branchId, signal),
    }),
};

export const workforceQueries = {
  departments: () =>
    queryOptions({
      queryKey: workforceKeys.departments,
      queryFn: ({ signal }) => workforceApi.departments(signal),
      staleTime: CATALOG_STALE_TIME,
    }),
  positions: () =>
    queryOptions({
      queryKey: workforceKeys.positions,
      queryFn: ({ signal }) => workforceApi.positions(signal),
      staleTime: CATALOG_STALE_TIME,
    }),
  cosigners: () =>
    queryOptions({
      queryKey: workforceKeys.cosigners,
      queryFn: ({ signal }) => workforceApi.cosigners(signal),
      staleTime: CATALOG_STALE_TIME,
    }),
  employmentContracts: (employeeId?: string) =>
    queryOptions({
      queryKey: workforceKeys.employmentContracts(employeeId),
      queryFn: ({ signal }) => workforceApi.employmentContracts(employeeId, signal),
    }),
  employees: (branchId: string) =>
    queryOptions({
      queryKey: workforceKeys.employees(branchId),
      queryFn: ({ signal }) => workforceApi.employees(branchId, signal),
      enabled: branchId.length > 0,
    }),
  employee: (id: string) =>
    queryOptions({
      queryKey: workforceKeys.employee(id),
      queryFn: ({ signal }) => workforceApi.employee(id, signal),
      enabled: id.length > 0,
    }),
  employmentPeriods: (employeeId: string) =>
    queryOptions({
      queryKey: workforceKeys.employmentPeriods(employeeId),
      queryFn: ({ signal }) => workforceApi.employmentPeriods(employeeId, signal),
      enabled: employeeId.length > 0,
    }),
};

export const devicesQueries = {
  list: (branchId: string) =>
    queryOptions({
      queryKey: devicesKeys.devices(branchId),
      queryFn: ({ signal }) => devicesApi.list(branchId, signal),
      enabled: branchId.length > 0,
    }),
  device: (id: string) =>
    queryOptions({
      queryKey: devicesKeys.device(id),
      queryFn: ({ signal }) => devicesApi.get(id, signal),
      enabled: id.length > 0,
    }),
  identities: (employeeId: string) =>
    queryOptions({
      queryKey: devicesKeys.identities(employeeId),
      queryFn: ({ signal }) => devicesApi.identities(employeeId, signal),
      enabled: employeeId.length > 0,
    }),
};

type AttendanceEventsQuery = Parameters<typeof attendanceApi.events>[0];
type AttendanceDaysQuery = Parameters<typeof attendanceApi.days>[0];
type RegisterQuery = Parameters<typeof attendanceApi.register>[0];
type ManualEntriesQuery = Parameters<typeof attendanceApi.manualEntries>[0];
type CorrectionsQuery = Parameters<typeof correctionsApi.list>[0];

export const attendanceQueries = {
  events: (query: AttendanceEventsQuery = {}) =>
    queryOptions({
      queryKey: attendanceKeys.events(query),
      queryFn: ({ signal }) => attendanceApi.events(query, signal),
    }),
  days: (query: AttendanceDaysQuery) =>
    queryOptions({
      queryKey: attendanceKeys.days(query),
      queryFn: ({ signal }) => attendanceApi.days(query, signal),
      enabled: query.employeeId.length > 0,
    }),
  pushBatches: (query: { deviceId?: string; limit?: number } = {}) =>
    queryOptions({
      queryKey: attendanceKeys.pushBatches(query.deviceId),
      queryFn: ({ signal }) => attendanceApi.pushBatches(query, signal),
    }),
  register: (query: RegisterQuery) =>
    queryOptions({
      queryKey: attendanceKeys.register(query),
      queryFn: ({ signal }) => attendanceApi.register(query, signal),
      enabled: query.branchId.length > 0,
    }),
  manualEntries: (query: ManualEntriesQuery) =>
    queryOptions({
      queryKey: attendanceKeys.manualEntries(query),
      queryFn: ({ signal }) => attendanceApi.manualEntries(query, signal),
      enabled: query.employeeId.length > 0,
    }),
};

export const correctionsQueries = {
  list: (query: CorrectionsQuery) =>
    queryOptions({
      queryKey: correctionsKeys.list(query),
      queryFn: ({ signal }) => correctionsApi.list(query, signal),
      enabled: query.employeeId.length > 0,
    }),
};

type ListClientsQuery = Parameters<typeof clientsApi.list>[0];
type ListOpportunitiesQuery = Parameters<typeof clientsApi.opportunities>[0];
type ListProjectsQuery = Parameters<typeof clientsApi.projects>[0];
type ListCommercialContractsQuery = Parameters<typeof clientsApi.commercialContracts>[0];
type ListInvoicesQuery = Parameters<typeof clientsApi.invoices>[0];
type ClientOverviewQuery = Parameters<typeof clientsApi.overview>[0];
type ListActivitiesQuery = Parameters<typeof clientsApi.activities>[0];

export const clientQueries = {
  overview: (query: ClientOverviewQuery = {}) =>
    queryOptions({
      queryKey: clientKeys.overview(query),
      queryFn: ({ signal }) => clientsApi.overview(query, signal),
    }),
  list: (query: ListClientsQuery = {}) =>
    queryOptions({
      queryKey: clientKeys.list(query),
      queryFn: ({ signal }) => clientsApi.list(query, signal),
    }),
  detail: (id: string) =>
    queryOptions({
      queryKey: clientKeys.detail(id),
      queryFn: ({ signal }) => clientsApi.get(id, signal),
      enabled: id.length > 0,
    }),
  profile: (id: string, asOf?: string) =>
    queryOptions({
      queryKey: clientKeys.profile(id, asOf),
      queryFn: ({ signal }) => clientsApi.profile(id, asOf, signal),
      enabled: id.length > 0,
    }),
  timeline: (id: string, asOf?: string) =>
    queryOptions({
      queryKey: clientKeys.timeline(id, asOf),
      queryFn: ({ signal }) => clientsApi.timeline(id, asOf, signal),
      enabled: id.length > 0,
    }),
  audit: (id: string) =>
    queryOptions({
      queryKey: clientKeys.audit(id),
      queryFn: ({ signal }) => clientsApi.audit(id, signal),
      enabled: id.length > 0,
    }),
  ownerAssignments: (id: string) =>
    queryOptions({
      queryKey: clientKeys.ownerAssignments(id),
      queryFn: ({ signal }) => clientsApi.ownerAssignments(id, signal),
      enabled: id.length > 0,
    }),
  contacts: (clientId: string) =>
    queryOptions({
      queryKey: clientKeys.contacts(clientId),
      queryFn: ({ signal }) => clientsApi.contacts({ clientId }, signal),
      enabled: clientId.length > 0,
    }),
  opportunities: (query: ListOpportunitiesQuery = {}) =>
    queryOptions({
      queryKey: clientKeys.opportunities(query),
      queryFn: ({ signal }) => clientsApi.opportunities(query, signal),
    }),
  opportunity: (id: string) =>
    queryOptions({
      queryKey: clientKeys.opportunity(id),
      queryFn: ({ signal }) => clientsApi.opportunity(id, signal),
      enabled: id.length > 0,
    }),
  stageTransitions: (opportunityId: string) =>
    queryOptions({
      queryKey: clientKeys.stageTransitions(opportunityId),
      queryFn: ({ signal }) => clientsApi.stageTransitions(opportunityId, signal),
      enabled: opportunityId.length > 0,
    }),
  projects: (query: ListProjectsQuery = {}) =>
    queryOptions({
      queryKey: clientKeys.projects(query),
      queryFn: ({ signal }) => clientsApi.projects(query, signal),
    }),
  commercialContracts: (query: ListCommercialContractsQuery = {}) =>
    queryOptions({
      queryKey: clientKeys.commercialContracts(query),
      queryFn: ({ signal }) => clientsApi.commercialContracts(query, signal),
    }),
  invoices: (query: ListInvoicesQuery = {}) =>
    queryOptions({
      queryKey: clientKeys.invoices(query),
      queryFn: ({ signal }) => clientsApi.invoices(query, signal),
    }),
  invoice: (id: string) =>
    queryOptions({
      queryKey: clientKeys.invoice(id),
      queryFn: ({ signal }) => clientsApi.invoice(id, signal),
      enabled: id.length > 0,
    }),
  notes: (clientId: string) =>
    queryOptions({
      queryKey: clientKeys.notes(clientId),
      queryFn: ({ signal }) => clientsApi.notes({ clientId }, signal),
      enabled: clientId.length > 0,
    }),
  activities: (query: ListActivitiesQuery) =>
    queryOptions({
      queryKey: clientKeys.activities(query),
      queryFn: ({ signal }) => clientsApi.activities(query, signal),
      enabled: Boolean(query.clientId || query.opportunityId),
    }),
  documents: (clientId: string) =>
    queryOptions({
      queryKey: clientKeys.documents(clientId),
      queryFn: ({ signal }) => clientsApi.documents({ clientId }, signal),
      enabled: clientId.length > 0,
    }),
  industries: () =>
    queryOptions({
      queryKey: clientKeys.industries,
      queryFn: ({ signal }) => clientsApi.industries(signal),
      staleTime: CATALOG_STALE_TIME,
    }),
  clientTypes: () =>
    queryOptions({
      queryKey: clientKeys.clientTypes,
      queryFn: ({ signal }) => clientsApi.clientTypes(signal),
      staleTime: CATALOG_STALE_TIME,
    }),
  companySizes: () =>
    queryOptions({
      queryKey: clientKeys.companySizes,
      queryFn: ({ signal }) => clientsApi.companySizes(signal),
      staleTime: CATALOG_STALE_TIME,
    }),
  pipelineStages: () =>
    queryOptions({
      queryKey: clientKeys.pipelineStages,
      queryFn: ({ signal }) => clientsApi.pipelineStages(signal),
      staleTime: CATALOG_STALE_TIME,
    }),
};

export const queries = {
  access: accessQueries,
  organization: organizationQueries,
  workforce: workforceQueries,
  devices: devicesQueries,
  attendance: attendanceQueries,
  corrections: correctionsQueries,
  clients: clientQueries,
};
