"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FileDown, Plus, ReceiptText } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useAccess } from "@/components/access-provider";
import { RequestErrorAlert } from "@/components/request-error-alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { clientKeys, clientQueries, clientsApi } from "@/lib/api";
import { clientName, money } from "@/lib/client-presentation";
import { formatDate } from "@/lib/format-date";
import { presentRequestError } from "@/lib/errors";
import { firstQueryFailure } from "@/lib/query-errors";

import { EmptyState, TabPanel } from "../client-profile/tab-shell";
import { DialogField, dialogFieldClass, RecordDialog } from "./record-dialog";

const PRESENTATION_TONES: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  sent: { label: "Sent", className: "bg-info/10 text-info" },
  paid: { label: "Paid", className: "bg-success/10 text-success" },
  overdue: { label: "Overdue", className: "bg-destructive/10 text-destructive" },
  void: { label: "Void", className: "bg-muted text-muted-foreground" },
};

const FILTERS = ["all", "paid", "sent", "overdue", "draft"] as const;

export function ClientInvoices() {
  const { can } = useAccess();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [issuing, setIssuing] = useState<{ id: string; invoiceNumber: string } | null>(null);
  const [voiding, setVoiding] = useState<{ id: string; invoiceNumber: string } | null>(null);

  const invoicesQuery = useQuery(clientQueries.invoices());
  const clientsQuery = useQuery(clientQueries.list({ pageSize: 100 }));

  const createInvoice = useMutation({
    mutationFn: clientsApi.createInvoice,
    onSuccess: async () => {
      setDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: clientKeys.invoicesAll });
    },
  });

  const issueInvoice = useMutation({
    mutationFn: clientsApi.issueInvoice,
    onSuccess: async () => {
      setIssuing(null);
      await queryClient.invalidateQueries({ queryKey: clientKeys.invoicesAll });
    },
  });

  const voidInvoice = useMutation({
    mutationFn: clientsApi.voidInvoice,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clientKeys.invoicesAll });
    },
  });

  const loadFailure = firstQueryFailure([
    [invoicesQuery, "Could not load invoices."],
    [clientsQuery, "Could not load clients."],
  ]);
  const clients = clientsQuery.data?.items ?? [];
  const allInvoices = invoicesQuery.data ?? [];
  const rows =
    filter === "all"
      ? allInvoices
      : allInvoices.filter((row) => row.paymentSummary.presentationStatus === filter);

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-strong font-heading text-2xl font-bold tracking-[-0.03em]">
            Invoices
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Payment requests issued to clients, with what is still outstanding.
          </p>
        </div>
        {can("invoices.create") ? (
          <Button
            className="h-10 rounded-[11px] px-4 font-bold"
            onClick={() => {
              createInvoice.reset();
              setDialogOpen(true);
            }}
          >
            <Plus aria-hidden="true" />
            Create invoice
          </Button>
        ) : null}
      </header>

      <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filter invoices">
        {FILTERS.map((option) => (
          <Button
            key={option}
            type="button"
            variant={filter === option ? "default" : "outline"}
            className="h-9 rounded-full px-4 text-xs font-bold capitalize"
            aria-pressed={filter === option}
            onClick={() => setFilter(option)}
          >
            {option}
          </Button>
        ))}
      </div>

      {loadFailure ? (
        <RequestErrorAlert error={loadFailure.error} onRetry={loadFailure.retry} />
      ) : null}
      {voidInvoice.error ? (
        <RequestErrorAlert
          error={presentRequestError(voidInvoice.error, "Could not void the invoice.")}
        />
      ) : null}

      {rows.length === 0 && !invoicesQuery.isPending ? (
        <TabPanel>
          <EmptyState
            icon={<ReceiptText className="size-5" aria-hidden="true" />}
            title="No invoices here"
            hint="Invoices are created as drafts, then issued with their dates. Try another filter."
          />
        </TabPanel>
      ) : (
        <TabPanel className="overflow-hidden">
          <div className="overflow-x-auto">
            <table
              className="w-full border-collapse text-left text-xs"
              style={{ minWidth: "980px" }}
            >
              <caption className="sr-only">Invoices</caption>
              <thead className="bg-[var(--surface-subtle)] text-[0.6875rem] tracking-[0.06em] text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="px-5 py-3.5 font-bold">
                    Invoice
                  </th>
                  <th scope="col" className="px-4 py-3.5 font-bold">
                    Client
                  </th>
                  <th scope="col" className="px-4 py-3.5 font-bold">
                    Issued
                  </th>
                  <th scope="col" className="px-4 py-3.5 font-bold">
                    Due
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right font-bold">
                    Amount
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right font-bold">
                    Outstanding
                  </th>
                  <th scope="col" className="px-4 py-3.5 font-bold">
                    Status
                  </th>
                  <th scope="col" className="w-14 px-4 py-3.5">
                    <span className="sr-only">Document</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => {
                  const invoice = row.invoice;
                  const tone =
                    PRESENTATION_TONES[row.paymentSummary.presentationStatus] ??
                    PRESENTATION_TONES.draft!;
                  return (
                    <tr key={invoice.id} className="border-t border-border hover:bg-muted/40">
                      <td className="text-strong px-5 py-3.5 font-bold">{invoice.invoiceNumber}</td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {row.client ? clientName(row.client) : "—"}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {invoice.issuedOn ? formatDate(invoice.issuedOn) : "Not issued"}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground">
                        {invoice.dueOn ? formatDate(invoice.dueOn) : "—"}
                      </td>
                      <td className="text-strong px-4 py-3.5 text-right font-bold">
                        {money(invoice.totalAmount, invoice.currency)}
                      </td>
                      <td className="px-4 py-3.5 text-right text-muted-foreground">
                        {money(row.paymentSummary.outstandingAmount, invoice.currency)}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-block rounded-full px-2.5 py-1 text-[0.6875rem] font-bold ${tone.className}`}
                        >
                          {tone.label}
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {invoice.lifecycleStatus === "draft" && can("invoices.issue") ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-8 rounded-[9px] px-3 font-bold"
                              onClick={() =>
                                setIssuing({ id: invoice.id, invoiceNumber: invoice.invoiceNumber })
                              }
                            >
                              Issue
                            </Button>
                          ) : null}
                          {invoice.lifecycleStatus === "issued" && can("invoices.void") ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="h-8 rounded-[9px] px-3 font-bold text-destructive hover:text-destructive"
                              onClick={() =>
                                setVoiding({ id: invoice.id, invoiceNumber: invoice.invoiceNumber })
                              }
                            >
                              Void
                            </Button>
                          ) : null}
                          <Button
                            asChild
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Open invoice ${invoice.invoiceNumber} as a document`}
                          >
                            <Link
                              href={`/dashboard/clients/invoices/${invoice.id}`}
                              prefetch={false}
                            >
                              <FileDown aria-hidden="true" />
                            </Link>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <footer className="flex min-h-14 items-center border-t border-border px-5 py-3">
            <p className="text-xs text-muted-foreground">
              {rows.length} of {allInvoices.length} invoices
            </p>
          </footer>
        </TabPanel>
      )}

      {dialogOpen ? (
        <RecordDialog
          title="Create invoice"
          description="Created as a draft — issue it to set the dates"
          icon={<ReceiptText className="size-5" />}
          busy={createInvoice.isPending}
          submitLabel="Create invoice"
          error={
            createInvoice.error
              ? presentRequestError(createInvoice.error, "Could not create the invoice.")
              : null
          }
          onClose={() => setDialogOpen(false)}
          onSubmit={(form) => {
            const data = new FormData(form);
            const clientId = String(data.get("clientId"));
            const branchId = clients.find((row) => row.client.id === clientId)?.branch.id ?? "";
            createInvoice.mutate({
              clientId,
              branchId,
              currency: "ETB",
              totalAmount: String(data.get("totalAmount")),
              description: String(data.get("description")) || null,
              note: String(data.get("note")) || null,
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
          <DialogField label="Amount (ETB)">
            <Input required name="totalAmount" inputMode="decimal" placeholder="420000.00" />
          </DialogField>
          <DialogField label="Description">
            <Input
              name="description"
              placeholder="What the amount is for (printed on the invoice)"
            />
          </DialogField>
          <DialogField label="Note">
            <Input name="note" placeholder="Optional remark (printed on the invoice)" />
          </DialogField>
          <p className="text-xs text-muted-foreground">
            The branch is taken from the client. A draft has no issue or due date until it is
            issued, which is why a draft can never be overdue.
          </p>
        </RecordDialog>
      ) : null}

      {issuing ? (
        <RecordDialog
          title={`Issue ${issuing.invoiceNumber}`}
          description="Issuing sets the dates and lets payments be recorded against it"
          icon={<ReceiptText className="size-5" />}
          busy={issueInvoice.isPending}
          submitLabel="Issue invoice"
          error={
            issueInvoice.error
              ? presentRequestError(issueInvoice.error, "Could not issue the invoice.")
              : null
          }
          onClose={() => setIssuing(null)}
          onSubmit={(form) => {
            const data = new FormData(form);
            issueInvoice.mutate({
              id: issuing.id,
              issuedOn: String(data.get("issuedOn")),
              dueOn: String(data.get("dueOn")),
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <DialogField label="Issued on">
              <Input required type="date" name="issuedOn" />
            </DialogField>
            <DialogField label="Due on">
              <Input required type="date" name="dueOn" />
            </DialogField>
          </div>
        </RecordDialog>
      ) : null}

      {voiding ? (
        <ConfirmDialog
          title={`Void ${voiding.invoiceNumber}?`}
          description="A void invoice no longer counts as owed and cannot take payments. Its number is kept for the records."
          confirmLabel="Void invoice"
          onCancel={() => setVoiding(null)}
          onConfirm={() => {
            voidInvoice.mutate(voiding.id);
            setVoiding(null);
          }}
        />
      ) : null}
    </div>
  );
}
