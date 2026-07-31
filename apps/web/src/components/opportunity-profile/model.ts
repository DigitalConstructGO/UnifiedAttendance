export const OPPORTUNITY_TABS = ["overview", "activities", "history"] as const;

export type OpportunityTab = (typeof OPPORTUNITY_TABS)[number];

export const OPPORTUNITY_TAB_LABELS = {
  overview: "Overview",
  activities: "Activities",
  history: "Stage history",
} as const satisfies Record<OpportunityTab, string>;

export function isOpportunityTab(value?: string): value is OpportunityTab {
  return OPPORTUNITY_TABS.includes(value as OpportunityTab);
}
