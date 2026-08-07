import { apiFetch } from "./client";
import { accessApi, accessKeys } from "./access";
import { attendanceApi, attendanceKeys } from "./attendance";
import { clientKeys, clientsApi } from "./clients";
import { correctionsApi, correctionsKeys } from "./corrections";
import { devicesApi, devicesKeys } from "./devices";
import { organizationApi, organizationKeys } from "./organization";
import { overviewApi, overviewKeys } from "./overview";
import { reportKeys, reportsApi } from "./reports";
import { workforceApi, workforceKeys } from "./workforce";

export * from "./client";
export * from "./access";
export * from "./attendance";
export * from "./clients";
export * from "./corrections";
export * from "./devices";
export * from "./organization";
export * from "./overview";
export * from "./reports";
export * from "./workforce";
export * from "./queries";

export const api = {
  health: () => apiFetch<string>("/health"),
  access: accessApi,
  organization: organizationApi,
  workforce: workforceApi,
  devices: devicesApi,
  attendance: attendanceApi,
  clients: clientsApi,
  corrections: correctionsApi,
  overview: overviewApi,
  reports: reportsApi,
};

export const queryKeys = {
  access: accessKeys,
  organization: organizationKeys,
  workforce: workforceKeys,
  devices: devicesKeys,
  attendance: attendanceKeys,
  clients: clientKeys,
  corrections: correctionsKeys,
  overview: overviewKeys,
  reports: reportKeys,
};
