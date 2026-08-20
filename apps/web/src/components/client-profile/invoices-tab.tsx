"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileDown, ReceiptText, Trash2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useAccess } from "@/components/access-provider";
import { RequestErrorAlert } from "@/components/request-error-alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { clientKeys, clientsApi, type InvoiceRow } from "@/lib/api";
import { money } from "@/lib/client-presentation";
import { presentRequestError } from "@/lib/errors";
import { formatDate } from "@/lib/format-date";

import { EmptyState, TabPanel } from "./tab-shell";

const INVOICE_STATUS_META: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  sent: { label: "Sent", className: "bg-info/10 text-info" },
  paid: { label: "Paid", className: "bg-success/10 text-success" },
  overdue: { label: "Overdue", className: "bg-destructive/10 text-destructive" },
  void: { label: "Void", className: "bg-muted text-muted-foreground" },
};

export function InvoicesTab({
  clientId,
  invoices,
  timeZone,
}: {
  clientId: string;
  invoices: InvoiceRow[];
  timeZone: string;
}) {
  const { can } = useAccess();
  const queryClient = useQueryClient();
  const deletable = can("invoices.delete");
  const [deleting, setDeleting] = useState<InvoiceRow | null>(null);

  const deleteInvoice = useMutation({
    mutationFn: (id: string) => clientsApi.deleteInvoice(id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: clientKeys.invoicesAll }),
        queryClient.invalidateQueries({ queryKey: clientKeys.detail(clientId) }),
      ]);
    },
  });

  if (invoices.length === 0) {
    return (
      <TabPanel>
        <EmptyState
          icon={<ReceiptText className="size-5" aria-hidden="true" />}
          title="No invoices yet"
          hint="Draft and issued invoices for this client will appear here."
        />
      </TabPanel>
    );
  }

  return (
    <TabPanel className="overflow-hidden">
      {deleteInvoice.error ? (
        <div className="p-4 pb-0">
          <RequestErrorAlert
            error={presentRequestError(deleteInvoice.error, "Could not delete this invoice.")}
          />
        </div>
      ) : null}

      <div className="divide-y divide-border sm:hidden">
        {invoices.map((row) => {
          const status =
            INVOICE_STATUS_META[row.paymentSummary.presentationStatus] ??
            INVOICE_STATUS_META.draft!;
          return (
            <div key={row.invoice.id} className="p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-strong font-bold">{row.invoice.invoiceNumber}</p>
                  <p className="mt-0.5 text-muted-foreground">
                    {row.invoice.issuedOn
                      ? `Issued ${formatDate(row.invoice.issuedOn, timeZone)}`
                      : "Not issued"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <Button
                    asChild
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Open invoice ${row.invoice.invoiceNumber} as a document`}
                  >
                    <Link href={`/dashboard/clients/invoices/${row.invoice.id}`} prefetch={false}>
                      <FileDown aria-hidden="true" />
                    </Link>
                  </Button>
                  {deletable ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Delete invoice ${row.invoice.invoiceNumber}`}
                      className="text-destructive hover:text-destructive"
                      onClick={() => setDeleting(row)}
                    >
                      <Trash2 aria-hidden="true" />
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <span
                  className={`inline-flex rounded-md px-2.5 py-1 text-[0.6875rem] font-bold ${status.className}`}
                >
                  {status.label}
                </span>
                <p className="text-strong text-right font-bold">
                  {money(row.invoice.totalAmount, row.invoice.currency)}
                </p>
              </div>

              <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-[0.6875rem]">
                <div>
                  <dt className="text-muted-foreground">Due</dt>
                  <dd className="mt-0.5 text-muted-foreground">
                    {formatDate(row.invoice.dueOn, timeZone)}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Outstanding</dt>
                  <dd className="text-strong mt-0.5 font-semibold">
                    {money(row.paymentSummary.outstandingAmount, row.invoice.currency)}
                  </dd>
                </div>
              </dl>
            </div>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto sm:block">
        <table className="w-full border-collapse text-left text-xs" style={{ minWidth: "900px" }}>
          <caption className="sr-only">Invoices for this client</caption>
          <thead className="bg-[var(--surface-subtle)] text-[0.6875rem] font-bold tracking-[0.06em] text-muted-foreground uppercase">
            <tr>
              <th scope="col" className="px-5 py-3.5">
                Invoice
              </th>
              <th scope="col" className="px-4 py-3.5">
                Issued
              </th>
              <th scope="col" className="px-4 py-3.5">
                Due
              </th>
              <th scope="col" className="px-4 py-3.5 text-right">
                Amount
              </th>
              <th scope="col" className="px-4 py-3.5 text-right">
                Outstanding
              </th>
              <th scope="col" className="px-4 py-3.5">
                Status
              </th>
              <th scope="col" className="w-24 px-4 py-3.5">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((row) => {
              const status =
                INVOICE_STATUS_META[row.paymentSummary.presentationStatus] ??
                INVOICE_STATUS_META.draft!;
              return (
                <tr key={row.invoice.id} className="border-t border-border">
                  <td className="text-strong px-5 py-4 font-bold">{row.invoice.invoiceNumber}</td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {row.invoice.issuedOn
                      ? formatDate(row.invoice.issuedOn, timeZone)
                      : "Not issued"}
                  </td>
                  <td className="px-4 py-4 text-muted-foreground">
                    {formatDate(row.invoice.dueOn, timeZone)}
                  </td>
                  <td className="text-strong px-4 py-4 text-right font-bold">
                    {money(row.invoice.totalAmount, row.invoice.currency)}
                  </td>
                  <td className="px-4 py-4 text-right text-muted-foreground">
                    {money(row.paymentSummary.outstandingAmount, row.invoice.currency)}
                  </td>
                  <td className="px-4 py-4">
                    <span
                      className={`inline-flex rounded-md px-2.5 py-1 text-[0.6875rem] font-bold ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        asChild
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Open invoice ${row.invoice.invoiceNumber} as a document`}
                      >
                        <Link
                          href={`/dashboard/clients/invoices/${row.invoice.id}`}
                          prefetch={false}
                        >
                          <FileDown aria-hidden="true" />
                        </Link>
                      </Button>
                      {deletable ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Delete invoice ${row.invoice.invoiceNumber}`}
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleting(row)}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {deleting ? (
        <ConfirmDialog
          title={`Delete invoice ${deleting.invoice.invoiceNumber} forever?`}
          description="This permanently erases the invoice and cannot be undone. An invoice with payments recorded, or documents linked to it, will refuse to go — payments are permanent, so remove any linked documents first."
          confirmLabel="Delete forever"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleteInvoice.mutate(deleting.invoice.id);
            setDeleting(null);
          }}
        />
      ) : null}
    </TabPanel>
  );
}
