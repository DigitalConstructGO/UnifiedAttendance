"use client";

import { FileSignature, Pencil } from "lucide-react";
import { useState } from "react";

import { useAccess } from "@/components/access-provider";
import { Button } from "@/components/ui/button";
import type { CommercialContractRow } from "@/lib/api";
import { CONTRACT_STATUS_META, RENEWAL_MODE_LABELS } from "@/lib/client-presentation";
import { formatDate } from "@/lib/format-date";

import { EditContractDialog } from "../client-agreements/edit-contract-dialog";
import { EmptyState, TabPanel } from "./tab-shell";

export function ContractsTab({
  contracts,
  timeZone,
}: {
  contracts: CommercialContractRow[];
  timeZone: string;
}) {
  const { can } = useAccess();
  const editable = can("commercial_contracts.update");
  const [editing, setEditing] = useState<CommercialContractRow | null>(null);

  if (contracts.length === 0) {
    return (
      <TabPanel>
        <EmptyState
          icon={<FileSignature className="size-5" aria-hidden="true" />}
          title="No commercial contracts"
          hint="Agreements signed with this client appear here with their term, renewal, and status."
        />
      </TabPanel>
    );
  }

  return (
    <TabPanel className="overflow-hidden">
      <div className="divide-y divide-border sm:hidden">
        {contracts.map((row) => {
          const { commercialContract: contract } = row;
          const status = CONTRACT_STATUS_META[contract.status];
          return (
            <div key={contract.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-strong font-bold">{contract.contractCode}</p>
                  <p className="mt-0.5 text-muted-foreground">
                    {contract.serviceName}
                    {contract.billingCadence ? ` · ${contract.billingCadence}` : ""}
                  </p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[0.6875rem] font-bold ${status.className}`}
                >
                  {status.label}
                </span>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[0.6875rem]">
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Term</dt>
                  <dd className="mt-0.5 text-muted-foreground">
                    {formatDate(contract.startsOn, timeZone)}
                    <span aria-hidden="true"> → </span>
                    <span className="sr-only">to </span>
                    {formatDate(contract.endsOn, timeZone)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Renewal</dt>
                  <dd className="text-strong mt-0.5 font-semibold">
                    {RENEWAL_MODE_LABELS[contract.renewalMode]}
                  </dd>
                </div>
              </dl>

              {editable ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mt-3 h-8 rounded-[9px] font-bold"
                  onClick={() => setEditing(row)}
                >
                  <Pencil aria-hidden="true" />
                  Edit
                </Button>
              ) : null}
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse text-left text-xs" style={{ minWidth: "720px" }}>
          <caption className="sr-only">Commercial contracts for this client</caption>
          <thead className="bg-[var(--surface-subtle)] text-[0.625rem] font-bold tracking-[0.06em] text-muted-foreground uppercase">
            <tr>
              <th scope="col" className="px-5 py-3.5">
                Contract
              </th>
              <th scope="col" className="px-4 py-3.5">
                Term
              </th>
              <th scope="col" className="px-4 py-3.5">
                Renewal
              </th>
              <th scope="col" className="px-4 py-3.5">
                Status
              </th>
              {editable ? (
                <th scope="col" className="px-4 py-3.5">
                  <span className="sr-only">Actions</span>
                </th>
              ) : null}
            </tr>
          </thead>
          <tbody>
            {contracts.map((row) => {
              const { commercialContract: contract } = row;
              const status = CONTRACT_STATUS_META[contract.status];
              return (
                <tr key={contract.id} className="border-t border-border">
                  <td className="px-5 py-4">
                    <p className="text-strong font-bold">{contract.contractCode}</p>
                    <p className="mt-0.5 text-muted-foreground">
                      {contract.serviceName}
                      {contract.billingCadence ? ` · ${contract.billingCadence}` : ""}
                    </p>
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {formatDate(contract.startsOn, timeZone)}
                    <span aria-hidden="true"> → </span>
                    <span className="sr-only">to </span>
                    {formatDate(contract.endsOn, timeZone)}
                  </td>
                  <td className="text-strong px-4 py-4 font-semibold">
                    {RENEWAL_MODE_LABELS[contract.renewalMode]}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`rounded-full px-2.5 py-1 text-[0.6875rem] font-bold ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </td>
                  {editable ? (
                    <td className="px-4 py-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-[9px] font-bold"
                        onClick={() => setEditing(row)}
                      >
                        <Pencil aria-hidden="true" />
                        Edit
                      </Button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {editing ? <EditContractDialog row={editing} onClose={() => setEditing(null)} /> : null}
    </TabPanel>
  );
}
