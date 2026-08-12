"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Banknote, Plus } from "lucide-react";
import { useState } from "react";

import { useAccess } from "@/components/access-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { clientKeys, clientsApi, workforceQueries, type InvoiceRow } from "@/lib/api";
import { money, normalizeAmount, personName } from "@/lib/client-presentation";
import { formatDate } from "@/lib/format-date";
import { presentRequestError } from "@/lib/errors";

import { DialogField, dialogFieldClass, RecordDialog } from "../client-agreements/record-dialog";
import { EmptyState, TabPanel } from "./tab-shell";

export function PaymentsTab({
  invoices,
  branchId,
  timeZone,
}: {
  invoices: InvoiceRow[];
  branchId: string;
  timeZone: string;
}) {
  const { can } = useAccess();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const employeesQuery = useQuery({
    ...workforceQueries.employees(branchId),
    enabled: dialogOpen && branchId.length > 0,
  });
  const recordPayment = useMutation({
    mutationFn: clientsApi.recordInvoicePayment,
    onSuccess: async () => {
      setDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: clientKeys.invoicesAll });
    },
  });
  const payments = invoices
    .flatMap((row) =>
      row.paymentSummary.payments.map((payment) => ({
        payment,
        invoiceNumber: row.invoice.invoiceNumber,
      })),
    )
    .sort((left, right) => right.payment.paidOn.localeCompare(left.payment.paidOn));
  const payableInvoices = invoices.filter(
    (row) =>
      row.invoice.lifecycleStatus === "issued" && Number(row.paymentSummary.outstandingAmount) > 0,
  );
  const employees = employeesQuery.data ?? [];

  return (
    <div className="space-y-4">
      {can("payments.record") && payableInvoices.length > 0 ? (
        <div className="flex justify-end">
          <Button
            type="button"
            className="h-10 rounded-[11px] bg-sidebar px-4 font-bold text-sidebar-foreground hover:bg-sidebar/90"
            onClick={() => {
              recordPayment.reset();
              setDialogOpen(true);
            }}
          >
            <Plus aria-hidden="true" />
            Record payment
          </Button>
        </div>
      ) : null}

      {payments.length === 0 ? (
        <TabPanel>
          <EmptyState
            icon={<Banknote className="size-5" aria-hidden="true" />}
            title="No payments recorded"
            hint="Payments recorded against this client’s issued invoices will appear here."
          />
        </TabPanel>
      ) : (
        <TabPanel className="overflow-hidden">
          <div className="overflow-x-auto">
            <table
              className="w-full border-collapse text-left text-xs"
              style={{ minWidth: "760px" }}
            >
              <caption className="sr-only">Payments received from this client</caption>
              <thead className="bg-[var(--surface-subtle)] text-[0.6875rem] font-bold tracking-[0.06em] text-muted-foreground uppercase">
                <tr>
                  <th scope="col" className="px-5 py-3.5">
                    Invoice
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Paid on
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Method
                  </th>
                  <th scope="col" className="px-4 py-3.5">
                    Reference
                  </th>
                  <th scope="col" className="px-4 py-3.5 text-right">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {payments.map(({ payment, invoiceNumber }) => (
                  <tr key={payment.id} className="border-t border-border">
                    <td className="text-strong px-5 py-4 font-bold">{invoiceNumber}</td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {formatDate(payment.paidOn, timeZone)}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">{payment.method || "—"}</td>
                    <td className="px-4 py-4 text-muted-foreground">{payment.reference || "—"}</td>
                    <td className="text-strong px-4 py-4 text-right font-bold">
                      {money(payment.amount, payment.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabPanel>
      )}

      {dialogOpen ? (
        <RecordDialog
          title="Record payment"
          description="Apply a receipt to one outstanding invoice"
          icon={<Banknote className="size-5" />}
          busy={recordPayment.isPending}
          submitLabel="Record payment"
          error={
            recordPayment.error
              ? presentRequestError(recordPayment.error, "Could not record this payment.")
              : employeesQuery.error
                ? presentRequestError(
                    employeesQuery.error,
                    "Could not load employees for this branch.",
                  )
                : null
          }
          onClose={() => setDialogOpen(false)}
          onSubmit={(form) => {
            const data = new FormData(form);
            const invoiceId = String(data.get("invoiceId"));
            const invoice = payableInvoices.find((row) => row.invoice.id === invoiceId);
            if (!invoice) return;
            recordPayment.mutate({
              invoiceId,
              amount: normalizeAmount(data.get("amount")),
              currency: invoice.invoice.currency,
              paidOn: String(data.get("paidOn")),
              method: String(data.get("method")) || null,
              reference: String(data.get("reference")) || null,
              recordedByEmployeeId: String(data.get("recordedByEmployeeId")),
            });
          }}
        >
          <DialogField label="Invoice">
            <select required name="invoiceId" className={dialogFieldClass}>
              {payableInvoices.map((row) => (
                <option key={row.invoice.id} value={row.invoice.id}>
                  {row.invoice.invoiceNumber} ·{" "}
                  {money(row.paymentSummary.outstandingAmount, row.invoice.currency)} outstanding
                </option>
              ))}
            </select>
          </DialogField>
          <div className="grid gap-4 sm:grid-cols-2">
            <DialogField label="Amount">
              <Input required name="amount" inputMode="decimal" />
            </DialogField>
            <DialogField label="Paid on">
              <Input required type="date" name="paidOn" />
            </DialogField>
            <DialogField label="Recorded by">
              <select
                required
                name="recordedByEmployeeId"
                className={dialogFieldClass}
                disabled={employeesQuery.isPending || employeesQuery.isError}
                aria-busy={employeesQuery.isPending}
              >
                <option value="">
                  {employeesQuery.isPending ? "Loading employees…" : "Select employee"}
                </option>
                {employees.map((row) => (
                  <option key={row.employee.id} value={row.employee.id}>
                    {personName(row.person)}
                  </option>
                ))}
              </select>
            </DialogField>
            <DialogField label="Method">
              <Input name="method" placeholder="Bank transfer" />
            </DialogField>
          </div>
          <DialogField label="Reference">
            <Input name="reference" />
          </DialogField>
          {employeesQuery.error ? (
            <Button
              type="button"
              variant="outline"
              className="justify-self-start"
              onClick={() => employeesQuery.refetch()}
            >
              Retry loading employees
            </Button>
          ) : null}
        </RecordDialog>
      ) : null}
    </div>
  );
}
