import { apiFetch } from "./client";
import { accessApi, accessKeys } from "./access";
import { attendanceApi, attendanceKeys } from "./attendance";
import { correctionsApi, correctionsKeys } from "./corrections";
import { devicesApi, devicesKeys } from "./devices";
import { organizationApi, organizationKeys } from "./organization";
import { workforceApi, workforceKeys } from "./workforce";

export * from "./client";
export * from "./access";
export * from "./attendance";
export * from "./corrections";
export * from "./devices";
export * from "./organization";
export * from "./workforce";
export * from "./queries";

/** One entry point for callers: `api.workforce.departments()`. */
export const api = {
  health: () => apiFetch<string>("/health"),
  access: accessApi,
  organization: organizationApi,
  workforce: workforceApi,
  devices: devicesApi,
  attendance: attendanceApi,
  corrections: correctionsApi,
};

/** React Query keys, kept beside the fetchers they invalidate. */
export const queryKeys = {
  access: accessKeys,
  organization: organizationKeys,
  workforce: workforceKeys,
  devices: devicesKeys,
  attendance: attendanceKeys,
  corrections: correctionsKeys,
};
