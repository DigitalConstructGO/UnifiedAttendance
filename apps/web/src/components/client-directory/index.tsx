"use client";

import { useQuery } from "@tanstack/react-query";
import { Building2, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useAccess } from "@/components/access-provider";
import { RequestErrorAlert } from "@/components/request-error-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clientQueries } from "@/lib/api";
import { clientName, directoryStatusTone, initials, personName } from "@/lib/client-presentation";
import { ethiopianDate } from "@/lib/ethiopian-date";
import { firstQueryFailure } from "@/lib/query-errors";

import { EmptyState, TabPanel } from "../client-profile/tab-shell";

export function ClientDirectory() {
  const { can } = useAccess();
  const [search, setSearch] = useState("");
  const [industryId, setIndustryId] = useState("");

  // The search text is part of the query key, so TanStack cancels the request
  // for a stale keystroke instead of letting it overwrite a newer result.
  const clientsQuery = useQuery(
    clientQueries.list({
      search: search.trim() || undefined,
      industryId: industryId || undefined,
    }),
  );
  const industriesQuery = useQuery(clientQueries.industries());

  const loadFailure = firstQueryFailure([
    [clientsQuery, "Could not load clients."],
    [industriesQuery, "Could not load industries."],
  ]);
  const rows = clientsQuery.data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-[1240px] space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-strong font-heading text-2xl font-bold tracking-[-0.03em]">
            All clients
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Every company this workspace serves, with its owner and branch.
          </p>
        </div>
        {can("clients:manage") ? (
          <Button asChild className="h-10 rounded-[11px] px-4 font-bold">
            <Link href="/dashboard/clients/pipeline?view=create">
              <Plus aria-hidden="true" />
              Add client
            </Link>
          </Button>
        ) : null}
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-64 flex-1">
          <span className="sr-only">Search clients</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-10 rounded-[11px] bg-card pr-3 pl-9"
            placeholder="Search name, client code, or email…"
          />
        </label>
        <label className="text-strong grid gap-1.5 text-xs font-bold">
          <span className="sr-only">Filter by industry</span>
          <select
            value={industryId}
            onChange={(event) => setIndustryId(event.target.value)}
            className="h-10 rounded-[11px] border border-input bg-card px-3 text-xs font-normal"
          >
            <option value="">All industries</option>
            {(industriesQuery.data ?? []).map((industry) => (
              <option key={industry.id} value={industry.id}>
                {industry.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loadFailure ? (
        <RequestErrorAlert error={loadFailure.error} onRetry={loadFailure.retry} />
      ) : null}

      {rows.length === 0 && !clientsQuery.isPending ? (
        <TabPanel>
          <EmptyState
            icon={<Building2 className="size-5" aria-hidden="true" />}
            title="No clients found"
            hint="Adjust the search or filter, or add the first client from the pipeline board."
          />
        </TabPanel>
      ) : (
        <TabPanel className="overflow-hidden">
          <div className="overflow-x-auto">
            <table
              className="w-full border-collapse text-left text-xs"
              style={{ minWidth: "860px" }}
            >
              <caption className="sr-only">Client directory</caption>
              <thead className="bg-[var(--surface-subtle)] text-[0.625rem] font-bold tracking-[0.06em] text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="px-5 py-3.5">
                    Client
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Industry
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Account owner
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Branch
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Client since
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const status = directoryStatusTone(
                    row.directoryStatus?.kind ?? row.client.status,
                    row.directoryStatus?.label,
                  );
                  return (
                    <tr key={row.client.id} className="border-t border-border hover:bg-muted/40">
                      <td className="px-5 py-3.5">
                        <Link
                          href={`/dashboard/clients/${row.client.id}`}
                          className="flex items-center gap-3"
                        >
                          <span
                            aria-hidden="true"
                            className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-workflow/90 text-[0.625rem] font-bold text-white"
                          >
                            {initials(clientName(row.client))}
                          </span>
                          <span className="min-w-0">
                            <span className="text-strong block font-bold">
                              {clientName(row.client)}
                            </span>
                            <span className="block text-muted-foreground">
                              {row.client.clientCode}
                            </span>
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">{row.industry.name}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {personName(row.owner.person)}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">{row.branch.name}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {ethiopianDate(row.client.relationshipStartedOn, row.branch.timezone)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[0.6875rem] font-bold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <footer className="flex min-h-14 items-center border-t border-border px-5 py-3">
            <p className="text-xs text-muted-foreground">
              Showing {rows.length} of {clientsQuery.data?.total ?? 0} clients
            </p>
          </footer>
        </TabPanel>
      )}
    </div>
  );
}
