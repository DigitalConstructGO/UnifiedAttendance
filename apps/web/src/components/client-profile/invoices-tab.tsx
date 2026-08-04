import { ReceiptText } from "lucide-react";

import type { InvoiceRow } from "@/lib/api";
import { money } from "@/lib/client-presentation";
import { formatDate } from "@/lib/format-date";

import { EmptyState, TabPanel } from "./tab-shell";

const INVOICE_STATUS_META: Record<string, { label: string; className: string }> = {
  draft: { label: "Draft", className: "bg-muted text-muted-foreground" },
  sent: { label: "Sent", className: "bg-info/10 text-info" },
  paid: { label: "Paid", className: "bg-success/10 text-success" },
  overdue: { label: "Overdue", className: "bg-destructive/10 text-destructive" },
  void: { label: "Void", className: "bg-muted text-muted-foreground" },
};

export function InvoicesTab({ invoices, timeZone }: { invoices: InvoiceRow[]; timeZone: string }) {
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
      <div className="overflow-x-auto">
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </TabPanel>
  );
}
