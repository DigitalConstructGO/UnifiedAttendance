"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileSignature } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { clientKeys, clientsApi, type CommercialContractRow } from "@/lib/api";
import {
  CONTRACT_PAYMENT_STRUCTURES,
  CONTRACT_RENEWAL_MODES,
  CONTRACT_STATUS_META,
  normalizeAmount,
  PAYMENT_STRUCTURE_LABELS,
  RENEWAL_MODE_LABELS,
  type CommercialContractStatus,
} from "@/lib/client-presentation";
import { presentRequestError } from "@/lib/errors";

import { DialogField, dialogFieldClass, RecordDialog } from "./record-dialog";

const CONTRACT_STATUS_OPTIONS = [
  "draft",
  "active",
  "expired",
  "terminated",
  "cancelled",
] as const satisfies readonly CommercialContractStatus[];

/** Statuses that require a signed date before the service accepts them. */
function needsSignedOn(status: CommercialContractStatus) {
  return status !== "draft" && status !== "cancelled";
}

export function EditContractDialog({
  row,
  onClose,
}: {
  row: CommercialContractRow;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const contract = row.commercialContract;
  const [status, setStatus] = useState<CommercialContractStatus>(contract.status);

  const updateContract = useMutation({
    mutationFn: clientsApi.updateCommercialContract,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clientKeys.commercialContractsAll });
      await queryClient.invalidateQueries({ queryKey: clientKeys.all });
      onClose();
    },
  });

  return (
    <RecordDialog
      title={`Edit ${contract.contractCode}`}
      description="Change its status, term or amount"
      icon={<FileSignature className="size-5" />}
      busy={updateContract.isPending}
      submitLabel="Save changes"
      error={
        updateContract.error
          ? presentRequestError(updateContract.error, "Could not save the contract.")
          : null
      }
      onClose={onClose}
      onSubmit={(form) => {
        const data = new FormData(form);
        const amount = normalizeAmount(data.get("amount"));
        const signedOn = String(data.get("signedOn") ?? "").trim();
        updateContract.mutate({
          id: contract.id,
          serviceName: String(data.get("serviceName") ?? "").trim(),
          billingCadence: String(data.get("billingCadence") ?? "").trim() || null,
          startsOn: String(data.get("startsOn") ?? ""),
          endsOn: String(data.get("endsOn") ?? ""),
          renewalMode: String(data.get("renewalMode")) as (typeof CONTRACT_RENEWAL_MODES)[number],
          status,
          signedOn: signedOn || null,
          amount: amount || null,
          currency: amount ? "ETB" : null,
          paymentStructure: String(
            data.get("paymentStructure"),
          ) as (typeof CONTRACT_PAYMENT_STRUCTURES)[number],
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <DialogField label="Status">
          <select
            name="status"
            className={dialogFieldClass}
            value={status}
            onChange={(event) => setStatus(event.target.value as CommercialContractStatus)}
          >
            {CONTRACT_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {CONTRACT_STATUS_META[option].label}
              </option>
            ))}
          </select>
        </DialogField>
        <DialogField label="Signed on">
          <Input
            type="date"
            name="signedOn"
            required={needsSignedOn(status)}
            defaultValue={contract.signedOn ?? ""}
          />
        </DialogField>
        <DialogField label="Service">
          <Input required name="serviceName" defaultValue={contract.serviceName} />
        </DialogField>
        <DialogField label="Billing cadence">
          <Input name="billingCadence" defaultValue={contract.billingCadence ?? ""} />
        </DialogField>
        <DialogField label="Starts on">
          <Input required type="date" name="startsOn" defaultValue={contract.startsOn} />
        </DialogField>
        <DialogField label="Ends on">
          <Input required type="date" name="endsOn" defaultValue={contract.endsOn} />
        </DialogField>
        <DialogField label="Renewal">
          <select
            name="renewalMode"
            className={dialogFieldClass}
            defaultValue={contract.renewalMode}
          >
            {CONTRACT_RENEWAL_MODES.map((mode) => (
              <option key={mode} value={mode}>
                {RENEWAL_MODE_LABELS[mode]}
              </option>
            ))}
          </select>
        </DialogField>
        <DialogField label="Amount (ETB)">
          <Input name="amount" inputMode="decimal" defaultValue={contract.amount ?? ""} />
        </DialogField>
        <DialogField label="Payment">
          <select
            name="paymentStructure"
            className={dialogFieldClass}
            defaultValue={contract.paymentStructure}
          >
            {CONTRACT_PAYMENT_STRUCTURES.map((structure) => (
              <option key={structure} value={structure}>
                {PAYMENT_STRUCTURE_LABELS[structure]}
              </option>
            ))}
          </select>
        </DialogField>
      </div>
      {needsSignedOn(status) ? (
        <p className="text-xs text-muted-foreground">
          An active contract needs the date it was signed.
        </p>
      ) : null}
    </RecordDialog>
  );
}
