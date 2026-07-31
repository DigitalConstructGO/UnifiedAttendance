"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSignature, Plus } from "lucide-react";
import { useState } from "react";

import { useAccess } from "@/components/access-provider";
import { RequestErrorAlert } from "@/components/request-error-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clientKeys, clientQueries, clientsApi } from "@/lib/api";
import {
  clientName,
  CONTRACT_RENEWAL_MODES,
  CONTRACT_STATUS_META,
  RENEWAL_MODE_LABELS,
  type CommercialContractStatus,
} from "@/lib/client-presentation";
import { ethiopianDate } from "@/lib/ethiopian-date";
import { presentRequestError } from "@/lib/errors";
import { firstQueryFailure } from "@/lib/query-errors";

import { EmptyState, TabPanel } from "../client-profile/tab-shell";
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
        {can("clients:manage") ? (
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
          <div className="overflow-x-auto">
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
                            </span>
                          </span>
                        </div>
                      </td>
                      <td className="text-strong px-4 py-4 font-semibold">
                        {row.client ? clientName(row.client) : "—"}
                      </td>
                      <td className="px-4 py-4 text-muted-foreground">
                        {ethiopianDate(contract.startsOn)}
                        <span aria-hidden="true"> → </span>
                        <span className="sr-only">to </span>
                        {ethiopianDate(contract.endsOn)}
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
                    </tr>
                  );
                })}
              </tbody>
            </table>
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
              amount: String(data.get("amount")) || null,
              currency: String(data.get("amount")) ? "ETB" : null,
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
          </div>
          <p className="text-xs text-muted-foreground">
            The contract is created as a draft; sign it to make it active.
          </p>
        </RecordDialog>
      ) : null}
    </div>
  );
}
