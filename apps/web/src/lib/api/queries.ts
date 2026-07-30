import { queryOptions } from "@tanstack/react-query";

import { accessApi, accessKeys } from "./access";
import { attendanceApi, attendanceKeys } from "./attendance";
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

export const queries = {
  access: accessQueries,
  organization: organizationQueries,
  workforce: workforceQueries,
  devices: devicesQueries,
  attendance: attendanceQueries,
  corrections: correctionsQueries,
};
