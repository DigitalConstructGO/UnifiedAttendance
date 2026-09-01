"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, Banknote, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { useAccess } from "@/components/access-provider";
import { RequestErrorAlert } from "@/components/request-error-alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { clientKeys, clientsApi, workforceQueries, type InvoiceRow } from "@/lib/api";
import { money, normalizeAmount, personName } from "@/lib/client-presentation";
import { formatDate } from "@/lib/format-date";
import { presentRequestError } from "@/lib/errors";

import { DialogField, dialogFieldClass, RecordDialog } from "../client-agreements/record-dialog";
import { EmptyState, TabPanel } from "./tab-shell";

type PaymentEntry = {
  payment: InvoiceRow["paymentSummary"]["payments"][number];
  invoiceNumber: string;
  archived: boolean;
};

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
  const [editing, setEditing] = useState<PaymentEntry | null>(null);
  const [archiving, setArchiving] = useState<PaymentEntry | null>(null);
  const [deleting, setDeleting] = useState<PaymentEntry | null>(null);
  const employeesQuery = useQuery({
    ...workforceQueries.employees(branchId),
    enabled: dialogOpen && branchId.length > 0,
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: clientKeys.invoicesAll });
  const recordPayment = useMutation({
    mutationFn: clientsApi.recordInvoicePayment,
    onSuccess: async () => {
      setDialogOpen(false);
      await refresh();
    },
  });
  const updatePayment = useMutation({
    mutationFn: clientsApi.updateInvoicePayment,
    onSuccess: async () => {
      setEditing(null);
      await refresh();
    },
  });
  const archivePayment = useMutation({
    mutationFn: clientsApi.archiveInvoicePayment,
    onSuccess: refresh,
  });
  const deletePayment = useMutation({
    mutationFn: clientsApi.deleteInvoicePayment,
    onSuccess: refresh,
  });
  const payments: PaymentEntry[] = invoices
    .flatMap((row) => [
      ...row.paymentSummary.payments.map((payment) => ({
        payment,
        invoiceNumber: row.invoice.invoiceNumber,
        archived: false,
      })),
      ...row.paymentSummary.archivedPayments.map((payment) => ({
        payment,
        invoiceNumber: row.invoice.invoiceNumber,
        archived: true,
      })),
    ])
    .sort((left, right) => right.payment.paidOn.localeCompare(left.payment.paidOn));
  const payableInvoices = invoices.filter(
    (row) =>
      row.invoice.lifecycleStatus === "issued" && Number(row.paymentSummary.outstandingAmount) > 0,
  );
  const employees = employeesQuery.data ?? [];
  const canUpdate = can("payments.update");
  const canArchive = can("payments.archive");
  const canDelete = can("payments.delete");
  const showActions = canUpdate || canArchive || canDelete;

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

      {archivePayment.error ? (
        <RequestErrorAlert
          error={presentRequestError(archivePayment.error, "Could not archive this payment.")}
        />
      ) : null}
      {deletePayment.error ? (
        <RequestErrorAlert
          error={presentRequestError(deletePayment.error, "Could not delete this payment.")}
        />
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
                  {showActions ? (
                    <th scope="col" className="px-4 py-3.5 text-right">
                      Actions
                    </th>
                  ) : null}
                </tr>
              </thead>
              <tbody>
                {payments.map(({ payment, invoiceNumber, archived }) => (
                  <tr
                    key={payment.id}
                    className={`border-t border-border ${archived ? "opacity-60" : ""}`}
                  >
                    <td className="text-strong px-5 py-4 font-bold">
                      {invoiceNumber}
                      {archived ? (
                        <span className="ml-2 rounded-full bg-[var(--surface-subtle)] px-2 py-0.5 text-[0.6875rem] font-bold tracking-[0.06em] text-muted-foreground uppercase">
                          Archived
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">
                      {formatDate(payment.paidOn, timeZone)}
                    </td>
                    <td className="px-4 py-4 text-muted-foreground">{payment.method || "—"}</td>
                    <td className="px-4 py-4 text-muted-foreground">{payment.reference || "—"}</td>
                    <td
                      className={`text-strong px-4 py-4 text-right font-bold ${archived ? "line-through" : ""}`}
                    >
                      {money(payment.amount, payment.currency)}
                    </td>
                    {showActions ? (
                      <td className="px-4 py-4">
                        <div className="flex justify-end gap-1">
                          {!archived && canUpdate ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Edit payment of ${money(payment.amount, payment.currency)} on ${invoiceNumber}`}
                              onClick={() => {
                                updatePayment.reset();
                                setEditing({ payment, invoiceNumber, archived });
                              }}
                            >
                              <Pencil aria-hidden="true" />
                            </Button>
                          ) : null}
                          {!archived && canArchive ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Archive payment of ${money(payment.amount, payment.currency)} on ${invoiceNumber}`}
                              onClick={() => {
                                archivePayment.reset();
                                setArchiving({ payment, invoiceNumber, archived });
                              }}
                            >
                              <Archive aria-hidden="true" />
                            </Button>
                          ) : null}
                          {archived && canDelete ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              aria-label={`Delete payment of ${money(payment.amount, payment.currency)} on ${invoiceNumber}`}
                              onClick={() => {
                                deletePayment.reset();
                                setDeleting({ payment, invoiceNumber, archived });
                              }}
                            >
                              <Trash2 aria-hidden="true" />
                            </Button>
                          ) : null}
                        </div>
                      </td>
                    ) : null}
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

      {editing ? (
        <RecordDialog
          title="Edit payment"
          description={`Correct the payment recorded on ${editing.invoiceNumber}`}
          icon={<Banknote className="size-5" />}
          busy={updatePayment.isPending}
          submitLabel="Save changes"
          error={
            updatePayment.error
              ? presentRequestError(updatePayment.error, "Could not update this payment.")
              : null
          }
          onClose={() => setEditing(null)}
          onSubmit={(form) => {
            const data = new FormData(form);
            updatePayment.mutate({
              id: editing.payment.id,
              amount: normalizeAmount(data.get("amount")),
              paidOn: String(data.get("paidOn")),
              method: String(data.get("method")) || null,
              reference: String(data.get("reference")) || null,
            });
          }}
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <DialogField label="Amount">
              <Input
                required
                name="amount"
                inputMode="decimal"
                defaultValue={editing.payment.amount}
              />
            </DialogField>
            <DialogField label="Paid on">
              <Input required type="date" name="paidOn" defaultValue={editing.payment.paidOn} />
            </DialogField>
            <DialogField label="Method">
              <Input
                name="method"
                placeholder="Bank transfer"
                defaultValue={editing.payment.method ?? ""}
              />
            </DialogField>
            <DialogField label="Reference">
              <Input name="reference" defaultValue={editing.payment.reference ?? ""} />
            </DialogField>
          </div>
        </RecordDialog>
      ) : null}

      {archiving ? (
        <ConfirmDialog
          title={`Archive this payment of ${money(archiving.payment.amount, archiving.payment.currency)}?`}
          description={`The payment stops counting toward ${archiving.invoiceNumber} and the invoice balance reopens, but the record stays visible. Only an archived payment can be deleted.`}
          confirmLabel="Archive payment"
          onCancel={() => setArchiving(null)}
          onConfirm={() => {
            archivePayment.mutate(archiving.payment.id);
            setArchiving(null);
          }}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={`Delete this payment of ${money(deleting.payment.amount, deleting.payment.currency)} forever?`}
          description={`This permanently erases the archived payment on ${deleting.invoiceNumber} and cannot be undone.`}
          confirmLabel="Delete forever"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deletePayment.mutate(deleting.payment.id);
            setDeleting(null);
          }}
        />
      ) : null}
    </div>
  );
}
