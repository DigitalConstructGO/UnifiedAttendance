import type { Route } from "next";

export const CLIENT_TABS = [
  "overview",
  "contacts",
  "projects",
  "contracts",
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
  documents: "Documents",
  activities: "Activities",
  notes: "Notes",
  timeline: "Timeline",
  audit: "Audit log",
} as const satisfies Record<ClientTab, string>;

/**
 * Tabs whose services have not landed yet. They render the real layout with an
 * empty state rather than being hidden, so the navigation matches the design and
 * wiring each one later is a single query swap.
 */
export const PENDING_TABS = new Set<ClientTab>([
  "documents",
  "activities",
  "notes",
  "timeline",
  "audit",
]);

export function isClientTab(value: string | undefined): value is ClientTab {
  return CLIENT_TABS.includes(value as ClientTab);
}

/**
 * `typedRoutes` cannot prove a template literal matches a generated route, so the
 * one place that builds a profile URL states the type instead of every caller
 * casting at the `Link`.
 */
export function clientTabHref(clientId: string, tab: ClientTab) {
  return `/dashboard/clients/${clientId}?tab=${tab}` as Route;
}
