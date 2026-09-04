"use client";

import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, FileDown } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { RequestErrorAlert } from "@/components/request-error-alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { clientQueries, organizationQueries } from "@/lib/api";
import { exactMoney } from "@/lib/client-presentation";
import { formatDate } from "@/lib/format-date";
import { presentRequestError } from "@/lib/errors";
import { firstQueryFailure } from "@/lib/query-errors";

import { downloadInvoicePdf, type InvoiceDocumentData } from "./invoice-pdf";

function plainAmount(value: string) {
  const amount = Number(value);
  if (Number.isNaN(amount)) return value;
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function InvoiceDocument({ invoiceId }: { invoiceId: string }) {
  const invoiceQuery = useQuery(clientQueries.invoice(invoiceId));
  const organizationQuery = useQuery(organizationQueries.letterhead());
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<unknown>(null);

  const loadFailure = firstQueryFailure([
    [invoiceQuery, "Could not load the invoice."],
    [organizationQuery, "Could not load the organization."],
  ]);

  const row = invoiceQuery.data;
  const organization = organizationQuery.data;
  const data: InvoiceDocumentData | null =
    row && organization
      ? {
          organization: {
            name: organization.name,
            logoUrl: organization.logoUrl,
            tin: organization.tin,
            address: organization.address,
          },
          invoice: {
            number: row.invoice.invoiceNumber,
            dueOn: row.invoice.dueOn ? formatDate(row.invoice.dueOn) : null,
            draft: row.invoice.lifecycleStatus === "draft",
            billTo: row.client.legalName || row.client.tradingName || "",
            currency: row.invoice.currency,
            totalAmount: row.invoice.totalAmount,
            rows: [
              {
                name: row.client.legalName || row.client.tradingName || "",
                description: row.invoice.description ?? row.project?.name ?? "",
                amount: plainAmount(row.invoice.totalAmount),
                note: row.invoice.note ?? "",
              },
            ],
          },
        }
      : null;

  async function download() {
    if (!data) return;
    setDownloading(true);
    setDownloadError(null);
    try {
      await downloadInvoicePdf(data);
    } catch (error) {
      setDownloadError(error);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-[860px] space-y-5">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <Button asChild variant="outline" className="h-9 rounded-[9px] px-3">
          <Link href="/dashboard/clients/invoices" prefetch={false}>
            <ArrowLeft aria-hidden="true" />
            Invoices
          </Link>
        </Button>
        <Button
          className="h-9 rounded-[9px] px-4 font-bold shadow-[var(--shadow-action)]"
          disabled={!data || downloading}
          onClick={() => void download()}
        >
          <FileDown aria-hidden="true" />
          {downloading ? "Preparing PDF…" : "Download PDF"}
        </Button>
      </header>

      {loadFailure ? (
        <RequestErrorAlert error={loadFailure.error} onRetry={loadFailure.retry} />
      ) : null}
      {downloadError ? (
        <RequestErrorAlert error={presentRequestError(downloadError, "Could not build the PDF.")} />
      ) : null}

      {data ? (
        <Card className="rounded-[18px] py-0 shadow-[var(--shadow-card)] ring-border">
          <CardContent className="p-5 sm:p-10">
            <div className="flex items-start justify-between gap-6">
              <div>
                <p className="font-heading text-3xl font-bold tracking-[-0.02em] text-[oklch(0.72_0.13_115)]">
                  INVOICE
                </p>
                {data.invoice.dueOn ? (
                  <p className="mt-4 text-sm font-bold text-[oklch(0.72_0.13_115)]">
                    Due Date: <span className="text-strong font-normal">{data.invoice.dueOn}</span>
                  </p>
                ) : null}
                <p className="mt-2 text-sm font-bold text-[oklch(0.72_0.13_115)]">
                  Bill to: <span className="text-strong font-normal">{data.invoice.billTo}</span>
                </p>
              </div>
              <div className="text-right text-xs">
                {data.organization.logoUrl ? (
                  <img
                    src={data.organization.logoUrl}
                    alt=""
                    className="mb-2 ml-auto size-14 object-contain"
                  />
                ) : null}
                <p className="text-strong mb-2 text-sm font-bold">{data.organization.name}</p>
                <p>
                  <span className="font-bold">Invoice No:</span> {data.invoice.number}
                </p>
                {data.organization.tin ? (
                  <p>
                    <span className="font-bold">Tin No:</span> {data.organization.tin}
                  </p>
                ) : null}
                {data.organization.address ? (
                  <p className="mt-1 max-w-52 text-muted-foreground uppercase">
                    {data.organization.address}
                  </p>
                ) : null}
                {data.invoice.draft ? (
                  <p className="mt-2 font-bold text-muted-foreground">DRAFT</p>
                ) : null}
              </div>
            </div>

            <div className="mt-8 overflow-x-auto">
              <table className="w-full min-w-[520px] border-collapse text-center text-sm">
                <thead>
                  <tr className="bg-[oklch(0.42_0.09_265)] text-xs font-bold text-white">
                    <th className="border border-foreground/60 px-3 py-3">Name</th>
                    <th className="border border-foreground/60 px-3 py-3">Description</th>
                    <th className="border border-foreground/60 px-3 py-3">Amount</th>
                    <th className="border border-foreground/60 px-3 py-3">Note</th>
                  </tr>
                </thead>
                <tbody>
                  {data.invoice.rows.map((line, index) => (
                    <tr key={index}>
                      <td className="border border-foreground/60 px-3 py-4">{line.name}</td>
                      <td className="border border-foreground/60 px-3 py-4">{line.description}</td>
                      <td className="border border-foreground/60 px-3 py-4 font-numeric font-bold">
                        {line.amount}
                      </td>
                      <td className="border border-foreground/60 px-3 py-4">{line.note}</td>
                    </tr>
                  ))}
                  {Array.from({ length: Math.max(0, 3 - data.invoice.rows.length) }).map(
                    (_, index) => (
                      <tr key={`blank-${index}`}>
                        <td className="border border-foreground/60 px-3 py-5">&nbsp;</td>
                        <td className="border border-foreground/60 px-3 py-5" />
                        <td className="border border-foreground/60 px-3 py-5" />
                        <td className="border border-foreground/60 px-3 py-5" />
                      </tr>
                    ),
                  )}
                </tbody>
              </table>
            </div>

            <p className="mt-6 text-right text-base font-bold">
              Subtotal:{" "}
              <span className="font-numeric">
                {exactMoney(data.invoice.totalAmount, data.invoice.currency)}
              </span>
            </p>
          </CardContent>
        </Card>
      ) : null}

      {!data && !loadFailure ? (
        <div className="grid min-h-48 place-items-center" role="status">
          <p className="text-xs text-muted-foreground">Loading the invoice…</p>
        </div>
      ) : null}
    </div>
  );
}
