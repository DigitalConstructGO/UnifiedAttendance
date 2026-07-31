"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  PanelLeftOpen,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useAccess } from "@/components/access-provider";
import { RequestErrorAlert } from "@/components/request-error-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clientQueries } from "@/lib/api";
import {
  clientName,
  directoryStatusTone,
  industryTone,
  initials,
  personName,
} from "@/lib/client-presentation";
import { relativeTime } from "@/lib/ethiopian-date";
import { firstQueryFailure } from "@/lib/query-errors";

import { EmptyState, TabPanel } from "../client-profile/tab-shell";

const PAGE_SIZE = 8;

const DIRECTORY_STATUSES = [
  { value: "active_project", label: "Active project" },
  { value: "completed", label: "Completed" },
  { value: "recurring", label: "Recurring" },
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
] as const;

type DirectoryStatusFilter = (typeof DIRECTORY_STATUSES)[number]["value"];

const selectClass =
  "h-10 rounded-[11px] border border-input bg-card px-3 text-xs font-normal outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50";

const headerCellClass = "px-4 py-3.5 font-bold";

export function ClientDirectory() {
  const { can } = useAccess();
  const [search, setSearch] = useState("");
  const [directoryStatus, setDirectoryStatus] = useState<DirectoryStatusFilter | "">("");
  const [industryId, setIndustryId] = useState("");
  const [ownerEmployeeId, setOwnerEmployeeId] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ReadonlySet<string>>(new Set());

  const clientsQuery = useQuery(
    clientQueries.list({
      search: search.trim() || undefined,
      directoryStatus: directoryStatus || undefined,
      industryId: industryId || undefined,
      ownerEmployeeId: ownerEmployeeId || undefined,
      page,
      pageSize: PAGE_SIZE,
    }),
  );
  const industriesQuery = useQuery(clientQueries.industries());

  const loadFailure = firstQueryFailure([
    [clientsQuery, "Could not load clients."],
    [industriesQuery, "Could not load industries."],
  ]);
  const rows = clientsQuery.data?.items ?? [];
  const total = clientsQuery.data?.total ?? 0;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));

  /** Owner options come from the loaded rows, so the list only ever offers real owners. */
  const owners = new Map(
    rows.map((row) => [row.owner.employee.id, personName(row.owner.person)] as const),
  );
  const allOnPageSelected = rows.length > 0 && rows.every((row) => selected.has(row.client.id));

  function changeFilter(apply: () => void) {
    apply();
    setPage(1);
    setSelected(new Set());
  }

  function toggleRow(id: string) {
    const next = new Set(selected);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelected(next);
  }

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <label className="relative min-w-56 flex-1">
          <span className="sr-only">Search clients</span>
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden="true"
          />
          <Input
            value={search}
            onChange={(event) => changeFilter(() => setSearch(event.target.value))}
            className="h-10 rounded-[11px] bg-card pr-3 pl-9"
            placeholder="Search name, company, ID or email…"
          />
        </label>

        <label>
          <span className="sr-only">Filter by status</span>
          <select
            value={directoryStatus}
            onChange={(event) =>
              changeFilter(() =>
                setDirectoryStatus(event.target.value as DirectoryStatusFilter | ""),
              )
            }
            className={selectClass}
          >
            <option value="">All statuses</option>
            {DIRECTORY_STATUSES.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Filter by industry</span>
          <select
            value={industryId}
            onChange={(event) => changeFilter(() => setIndustryId(event.target.value))}
            className={selectClass}
          >
            <option value="">All industries</option>
            {(industriesQuery.data ?? []).map((industry) => (
              <option key={industry.id} value={industry.id}>
                {industry.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          <span className="sr-only">Filter by account owner</span>
          <select
            value={ownerEmployeeId}
            onChange={(event) => changeFilter(() => setOwnerEmployeeId(event.target.value))}
            className={selectClass}
          >
            <option value="">All owners</option>
            {[...owners].map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>

        <div className="ml-auto flex items-center gap-3">
          <Button variant="outline" className="h-10 rounded-[11px] px-4 font-semibold">
            <SlidersHorizontal aria-hidden="true" />
            Columns
          </Button>
          {can("clients:manage") ? (
            <Button asChild className="h-10 rounded-[11px] px-4 font-bold">
              <Link href="/dashboard/clients/pipeline?view=create">
                <Plus aria-hidden="true" />
                Add client
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {loadFailure ? (
        <RequestErrorAlert error={loadFailure.error} onRetry={loadFailure.retry} />
      ) : null}

      {rows.length === 0 && !clientsQuery.isPending ? (
        <TabPanel>
          <EmptyState
            icon={<Building2 className="size-5" aria-hidden="true" />}
            title="No clients found"
            hint="Adjust the search or filters, or add the first client from the pipeline board."
          />
        </TabPanel>
      ) : (
        <TabPanel className="overflow-hidden">
          <div className="overflow-x-auto">
            <table
              className="w-full border-collapse text-left text-xs"
              style={{ minWidth: "1040px" }}
            >
              <caption className="sr-only">Client directory</caption>
              <thead className="bg-[var(--surface-subtle)] text-[0.6875rem] tracking-[0.06em] text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="w-10 px-4 py-3.5">
                    <input
                      type="checkbox"
                      aria-label="Select all clients on this page"
                      checked={allOnPageSelected}
                      onChange={() =>
                        setSelected(
                          allOnPageSelected ? new Set() : new Set(rows.map((row) => row.client.id)),
                        )
                      }
                      className="size-4 accent-primary"
                    />
                  </th>
                  <th scope="col" className="px-2 py-3.5 font-bold">
                    Client
                  </th>
                  <th scope="col" className={headerCellClass}>
                    Industry
                  </th>
                  <th scope="col" className={headerCellClass}>
                    Status
                  </th>
                  <th scope="col" className={headerCellClass}>
                    Owner
                  </th>
                  <th scope="col" className={headerCellClass}>
                    Branch
                  </th>
                  <th scope="col" className={headerCellClass}>
                    Projects
                  </th>
                  <th scope="col" className={headerCellClass}>
                    Last activity
                  </th>
                  <th scope="col" className="w-12 px-4 py-3.5">
                    <span className="sr-only">Open</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const status = directoryStatusTone(
                    row.directoryStatus?.kind ?? row.client.status,
                    row.directoryStatus?.label,
                  );
                  const name = clientName(row.client);
                  return (
                    <tr key={row.client.id} className="border-t border-border hover:bg-muted/40">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          aria-label={`Select ${name}`}
                          checked={selected.has(row.client.id)}
                          onChange={() => toggleRow(row.client.id)}
                          className="size-4 accent-primary"
                        />
                      </td>
                      <td className="px-2 py-3">
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-workflow/90 text-[0.6875rem] font-bold text-white"
                          >
                            {initials(name)}
                          </span>
                          <span className="min-w-0">
                            <Link
                              href={`/dashboard/clients/${row.client.id}`}
                              className="text-strong block truncate font-bold hover:underline"
                            >
                              {name}
                            </Link>
                            <span className="block text-muted-foreground">
                              {row.client.clientCode}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2 text-muted-foreground">
                          <span
                            aria-hidden="true"
                            className={`size-1.5 shrink-0 rounded-full ${industryTone(row.industry.name)}`}
                          />
                          {row.industry.name}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-[0.6875rem] font-bold ${status.className}`}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="grid size-6 shrink-0 place-items-center rounded-md bg-muted text-[0.6875rem] font-bold text-muted-foreground"
                          >
                            {initials(personName(row.owner.person))}
                          </span>
                          <span className="text-strong font-semibold">
                            {personName(row.owner.person)}
                          </span>
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{row.branch.name}</td>
                      <td className="text-strong px-4 py-3 font-semibold">
                        {row.projectCount ?? 0}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {relativeTime(row.lastActivityAt, row.branch.timezone)}
                      </td>
                      <td className="px-4 py-3">
                        <Button
                          asChild
                          variant="outline"
                          size="icon-sm"
                          aria-label={`Open ${name}`}
                          className="rounded-[9px]"
                        >
                          <Link href={`/dashboard/clients/${row.client.id}`}>
                            <PanelLeftOpen aria-hidden="true" />
                          </Link>
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <footer className="flex min-h-14 flex-wrap items-center justify-between gap-3 border-t border-border px-5 py-3">
            <p className="text-xs text-muted-foreground">
              {rows.length} of {total} clients
            </p>
            <div className="flex items-center gap-1">
              <Button
                size="icon-sm"
                variant="outline"
                aria-label="Previous page"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                <ChevronLeft aria-hidden="true" />
              </Button>
              <span className="px-2 text-xs font-semibold text-muted-foreground">
                {page} / {pageCount}
              </span>
              <Button
                size="icon-sm"
                variant="outline"
                aria-label="Next page"
                disabled={page >= pageCount}
                onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
              >
                <ChevronRight aria-hidden="true" />
              </Button>
            </div>
          </footer>
        </TabPanel>
      )}
    </div>
  );
}
