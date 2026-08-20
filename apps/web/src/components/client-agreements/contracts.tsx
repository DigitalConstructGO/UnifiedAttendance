"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSignature, Pencil, Plus } from "lucide-react";
import { useState } from "react";

import { useAccess } from "@/components/access-provider";
import { RequestErrorAlert } from "@/components/request-error-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clientKeys, clientQueries, clientsApi, type CommercialContractRow } from "@/lib/api";
import {
  clientName,
  CONTRACT_PAYMENT_STRUCTURES,
  CONTRACT_RENEWAL_MODES,
  CONTRACT_STATUS_META,
  normalizeAmount,
  PAYMENT_STRUCTURE_LABELS,
  RENEWAL_MODE_LABELS,
  type CommercialContractStatus,
} from "@/lib/client-presentation";
import { formatDate } from "@/lib/format-date";
import { presentRequestError } from "@/lib/errors";
import { firstQueryFailure } from "@/lib/query-errors";

import { EmptyState, TabPanel } from "../client-profile/tab-shell";
import { EditContractDialog } from "./edit-contract-dialog";
import { DialogField, dialogFieldClass, RecordDialog } from "./record-dialog";

const EXPIRING_SOON_DAYS = 60;

function contractTone(status: CommercialContractStatus, endsOn: string) {
  if (status !== "active") return CONTRACT_STATUS_META[status];
  const daysLeft = (new Date(`${endsOn}T12:00:00Z`).getTime() - Date.now()) / 86_400_000;
  if (daysLeft <= EXPIRING_SOON_DAYS) {
    return { label: "Expiring soon", className: "bg-warning/15 text-amber-700 dark:text-warning" };
  }
  return CONTRACT_STATUS_META.active;
}

export function ClientContracts() {
  const { can } = useAccess();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<CommercialContractRow | null>(null);
  const editable = can("commercial_contracts.update");

  const contractsQuery = useQuery(clientQueries.commercialContracts());
  const clientsQuery = useQuery(clientQueries.list({ pageSize: 100 }));

  const createContract = useMutation({
    mutationFn: clientsApi.createCommercialContract,
    onSuccess: async () => {
      setDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: clientKeys.commercialContractsAll });
    },
  });

  const loadFailure = firstQueryFailure([
    [contractsQuery, "Could not load commercial contracts."],
    [clientsQuery, "Could not load clients."],
  ]);
  const contracts = contractsQuery.data ?? [];
  const clients = clientsQuery.data?.items ?? [];

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-strong font-heading text-2xl font-bold tracking-[-0.03em]">
            Contracts
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Commercial agreements across every client, with their term and renewal.
          </p>
        </div>
        {can("commercial_contracts.create") ? (
          <Button
            className="h-10 rounded-[11px] px-4 font-bold"
            onClick={() => {
              createContract.reset();
              setDialogOpen(true);
            }}
          >
            <Plus aria-hidden="true" />
            New contract
          </Button>
        ) : null}
      </header>

      {loadFailure ? (
        <RequestErrorAlert error={loadFailure.error} onRetry={loadFailure.retry} />
      ) : null}

      {contracts.length === 0 && !contractsQuery.isPending ? (
        <TabPanel>
          <EmptyState
            icon={<FileSignature className="size-5" aria-hidden="true" />}
            title="No commercial contracts"
            hint="Agreements signed with clients appear here with their term, renewal, and status."
          />
        </TabPanel>
      ) : (
        <TabPanel className="overflow-hidden">
          <div className="hidden overflow-x-auto sm:block">
            <table
              className="w-full border-collapse text-left text-xs"
              style={{ minWidth: "940px" }}
            >
              <caption className="sr-only">Commercial contracts</caption>
              <thead className="bg-[var(--surface-subtle)] text-[0.6875rem] tracking-[0.06em] text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="px-5 py-3.5 font-bold">
                    Contract
                  </th>
                  <th scope="col" className="px-4 py-3.5 font-bold">
                    Client
                  </th>
                  <th scope="col" className="px-4 py-3.5 font-bold">
                    Term
                  </th>
                  <th scope="col" className="px-4 py-3.5 font-bold">
                    Renewal
                  </th>
                  <th scope="col" className="px-4 py-3.5 font-bold">
                    Status
                  </th>
                  {editable ? (
                    <th scope="col" className="px-4 py-3.5 font-bold">
                      <span className="sr-only">Actions</span>
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {contracts.map((row) => {
                  const contract = row.commercialContract;
                  const tone = contractTone(contract.status, contract.endsOn);
                  return (
                    <tr key={contract.id} className="border-t border-border hover:bg-muted/40">
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <span
                            aria-hidden="true"
                            className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-success/10 text-success"
                          >
                            <FileSignature className="size-4" />
                          </span>
                          <span>
                            <span className="text-strong block font-bold">
                              {contract.contractCode}
                            </span>
                            <span className="block text-muted-foreground">
                              {contract.serviceName}
                              {contract.billingCadence ? ` · ${contract.billingCadence}` : ""}
                              {` · ${PAYMENT_STRUCTURE_LABELS[contract.paymentStructure]}`}
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="text-strong px-4 py-4 font-semibold">
                        {row.client ? clientName(row.client) : "—"}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {formatDate(contract.startsOn)}
                        <span aria-hidden="true"> → </span>
                        <span className="sr-only">to </span>
                        {formatDate(contract.endsOn)}
                      </td>
                      <td className="text-strong px-4 py-4 font-semibold">
                        {RENEWAL_MODE_LABELS[contract.renewalMode]}
                      </td>
                      <td className="px-4 py-4">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-[0.6875rem] font-bold ${tone.className}`}
                        >
                          {tone.label}
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

          <div className="divide-y divide-border sm:hidden">
            {contracts.map((row) => {
              const contract = row.commercialContract;
              const tone = contractTone(contract.status, contract.endsOn);
              return (
                <div key={contract.id} className="p-4">
                  <div className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-success/10 text-success"
                    >
                      <FileSignature className="size-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="text-strong font-bold">{contract.contractCode}</p>
                          <p className="text-xs text-muted-foreground">
                            {contract.serviceName}
                            {contract.billingCadence ? ` · ${contract.billingCadence}` : ""}
                            {` · ${PAYMENT_STRUCTURE_LABELS[contract.paymentStructure]}`}
                          </p>
                        </div>
                        <span
                          className={`inline-block shrink-0 rounded-full px-2.5 py-1 text-[0.6875rem] font-bold ${tone.className}`}
                        >
                          {tone.label}
                        </span>
                      </div>

                      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                        <div>
                          <dt className="text-muted-foreground">Client</dt>
                          <dd className="text-strong font-semibold">
                            {row.client ? clientName(row.client) : "—"}
                          </dd>
                        </div>
                        <div>
                          <dt className="text-muted-foreground">Renewal</dt>
                          <dd className="text-strong font-semibold">
                            {RENEWAL_MODE_LABELS[contract.renewalMode]}
                          </dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-muted-foreground">Term</dt>
                          <dd className="text-strong font-semibold">
                            {formatDate(contract.startsOn)}
                            <span aria-hidden="true"> → </span>
                            <span className="sr-only">to </span>
                            {formatDate(contract.endsOn)}
                          </dd>
                        </div>
                      </dl>

                      {editable ? (
                        <div className="mt-3">
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
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabPanel>
      )}

      {dialogOpen ? (
        <RecordDialog
          title="New contract"
          description="A contract code is assigned automatically"
          icon={<FileSignature className="size-5" />}
          busy={createContract.isPending}
          submitLabel="Create contract"
          error={
            createContract.error
              ? presentRequestError(createContract.error, "Could not create the contract.")
              : null
          }
          onClose={() => setDialogOpen(false)}
          onSubmit={(form) => {
            const data = new FormData(form);
            createContract.mutate({
              clientId: String(data.get("clientId")),
              serviceName: String(data.get("serviceName")),
              billingCadence: String(data.get("billingCadence")) || null,
              startsOn: String(data.get("startsOn")),
              endsOn: String(data.get("endsOn")),
              renewalMode: String(
                data.get("renewalMode"),
              ) as (typeof CONTRACT_RENEWAL_MODES)[number],
              amount: normalizeAmount(data.get("amount")) || null,
              currency: normalizeAmount(data.get("amount")) ? "ETB" : null,
              paymentStructure: String(
                data.get("paymentStructure"),
              ) as (typeof CONTRACT_PAYMENT_STRUCTURES)[number],
            });
          }}
        >
          <DialogField label="Client">
            <select required name="clientId" className={dialogFieldClass}>
              {clients.map((row) => (
                <option key={row.client.id} value={row.client.id}>
                  {clientName(row.client)}
                </option>
              ))}
            </select>
          </DialogField>

          <div className="grid gap-4 sm:grid-cols-2">
            <DialogField label="Service">
              <Input required name="serviceName" placeholder="Managed service" />
            </DialogField>
            <DialogField label="Billing cadence">
              <Input name="billingCadence" placeholder="annual" />
            </DialogField>
            <DialogField label="Starts on">
              <Input required type="date" name="startsOn" />
            </DialogField>
            <DialogField label="Ends on">
              <Input required type="date" name="endsOn" />
            </DialogField>
            <DialogField label="Renewal">
              <select name="renewalMode" className={dialogFieldClass} defaultValue="manual">
                {CONTRACT_RENEWAL_MODES.map((mode) => (
                  <option key={mode} value={mode}>
                    {RENEWAL_MODE_LABELS[mode]}
                  </option>
                ))}
              </select>
            </DialogField>
            <DialogField label="Amount (ETB)">
              <Input name="amount" inputMode="decimal" placeholder="1740000.00" />
            </DialogField>
            <DialogField label="Payment">
              <select name="paymentStructure" className={dialogFieldClass} defaultValue="full">
                {CONTRACT_PAYMENT_STRUCTURES.map((structure) => (
                  <option key={structure} value={structure}>
                    {PAYMENT_STRUCTURE_LABELS[structure]}
                  </option>
                ))}
              </select>
            </DialogField>
          </div>
          <p className="text-xs text-muted-foreground">
            The contract is created as a draft; sign it to make it active.
          </p>
        </RecordDialog>
      ) : null}

      {editing ? <EditContractDialog row={editing} onClose={() => setEditing(null)} /> : null}
    </div>
  );
}
