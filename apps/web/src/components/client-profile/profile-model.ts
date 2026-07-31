import type { Route } from "next";

export const CLIENT_TABS = [
  "overview",
  "contacts",
  "projects",
  "contracts",
  "invoices",
  "payments",
  "documents",
  "activities",
  "notes",
  "timeline",
  "audit",
] as const;

export type ClientTab = (typeof CLIENT_TABS)[number];

export const CLIENT_TAB_LABELS = {
  overview: "Overview",
  contacts: "Contacts",
  projects: "Projects",
  contracts: "Contracts",
  invoices: "Invoices",
  payments: "Payments",
  documents: "Documents",
  activities: "Activities",
  notes: "Notes",
  timeline: "Timeline",
  audit: "Audit log",
} as const satisfies Record<ClientTab, string>;

export function isClientTab(value: string | undefined): value is ClientTab {
  return CLIENT_TABS.includes(value as ClientTab);
}

export function clientTabHref(clientId: string, tab: ClientTab, opportunityId?: string) {
  const query = new URLSearchParams({ tab });
  if (opportunityId) query.set("opportunityId", opportunityId);
  return `/dashboard/clients/${clientId}?${query.toString()}` as Route;
}
