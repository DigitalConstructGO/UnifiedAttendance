"use client";

import { useQuery } from "@tanstack/react-query";

import { clientQueries } from "@/lib/api";
import { firstQueryFailure } from "@/lib/query-errors";

/**
 * Every profile tab reads from this one hook so the header, the Overview
 * summary, and the per-tab lists always agree. The tab-scoped queries stay
 * mounted across tab switches, which is why moving between tabs is instant
 * after the first visit.
 */
export function useClientProfile(clientId: string) {
  const clientQuery = useQuery(clientQueries.detail(clientId));
  const contactsQuery = useQuery(clientQueries.contacts(clientId));
  const projectsQuery = useQuery(clientQueries.projects({ clientId }));
  const contractsQuery = useQuery(clientQueries.commercialContracts({ clientId }));

  const loadFailure = firstQueryFailure([
    [clientQuery, "Could not load this client."],
    [contactsQuery, "Could not load contacts."],
    [projectsQuery, "Could not load projects."],
    [contractsQuery, "Could not load commercial contracts."],
  ]);

  return {
    client: clientQuery.data ?? null,
    contacts: contactsQuery.data ?? [],
    projects: projectsQuery.data ?? [],
    contracts: contractsQuery.data ?? [],
    primaryContact: contactsQuery.data?.find((contact) => contact.isPrimary) ?? null,
    loading: clientQuery.isPending,
    error: loadFailure?.error ?? null,
    retry: loadFailure?.retry,
  };
}

export type ClientProfile = ReturnType<typeof useClientProfile>;
