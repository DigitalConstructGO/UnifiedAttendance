"use client";

import { useQuery } from "@tanstack/react-query";

import { clientQueries } from "@/lib/api";
import { firstQueryFailure } from "@/lib/query-errors";

import type { ClientTab } from "./profile-model";

export function useClientProfile(clientId: string, tab: ClientTab, opportunityId?: string) {
  const profileQuery = useQuery(clientQueries.profile(clientId));
  const opportunityQuery = useQuery(clientQueries.opportunity(opportunityId ?? ""));
  const contactsQuery = useQuery({
    ...clientQueries.contacts(clientId),
    enabled: tab === "contacts",
  });
  const projectsQuery = useQuery({
    ...clientQueries.projects({ clientId }),
    enabled: tab === "projects",
  });
  const contractsQuery = useQuery({
    ...clientQueries.commercialContracts({ clientId }),
    enabled: tab === "contracts",
  });
  const invoicesQuery = useQuery({
    ...clientQueries.invoices({ clientId }),
    enabled: tab === "overview" || tab === "invoices" || tab === "payments",
  });
  const documentsQuery = useQuery({
    ...clientQueries.documents(clientId),
    enabled: tab === "documents",
  });
  const activitiesQuery = useQuery({
    ...clientQueries.activities({ clientId }),
    enabled: tab === "activities",
  });
  const notesQuery = useQuery({
    ...clientQueries.notes(clientId),
    enabled: tab === "notes",
  });
  const timelineQuery = useQuery({
    ...clientQueries.timeline(clientId),
    enabled: tab === "timeline",
  });
  const auditQuery = useQuery({
    ...clientQueries.audit(clientId),
    enabled: tab === "audit",
  });

  const loadFailure = firstQueryFailure([
    [profileQuery, "Could not load this client."],
    [opportunityQuery, "Could not load this lead."],
    [contactsQuery, "Could not load contacts."],
    [projectsQuery, "Could not load projects."],
    [contractsQuery, "Could not load commercial contracts."],
    [invoicesQuery, "Could not load invoices and payments."],
    [documentsQuery, "Could not load documents."],
    [activitiesQuery, "Could not load activities."],
    [notesQuery, "Could not load notes."],
    [timelineQuery, "Could not load the timeline."],
    [auditQuery, "Could not load the audit log."],
  ]);

  const tabQueries = {
    overview: invoicesQuery,
    contacts: contactsQuery,
    projects: projectsQuery,
    contracts: contractsQuery,
    invoices: invoicesQuery,
    payments: invoicesQuery,
    documents: documentsQuery,
    activities: activitiesQuery,
    notes: notesQuery,
    timeline: timelineQuery,
    audit: auditQuery,
  } satisfies Record<ClientTab, { isPending: boolean }>;

  return {
    client: profileQuery.data ?? null,
    opportunity: opportunityQuery.data ?? null,
    contacts: contactsQuery.data ?? [],
    projects:
      tab === "overview" ? (profileQuery.data?.currentProjects ?? []) : (projectsQuery.data ?? []),
    contracts: contractsQuery.data ?? [],
    invoices: invoicesQuery.data ?? [],
    documents: documentsQuery.data ?? [],
    activities: activitiesQuery.data ?? [],
    notes: notesQuery.data ?? [],
    timeline: timelineQuery.data ?? [],
    audit: auditQuery.data ?? [],
    primaryContact: profileQuery.data?.primaryContact ?? null,
    health: profileQuery.data?.health ?? null,
    lastActivityAt: profileQuery.data?.lastActivityAt ?? null,
    loading: profileQuery.isPending || (Boolean(opportunityId) && opportunityQuery.isPending),
    tabLoading: tabQueries[tab].isPending,
    error: loadFailure?.error ?? null,
    retry: loadFailure?.retry,
  };
}

export type ClientProfile = ReturnType<typeof useClientProfile>;
