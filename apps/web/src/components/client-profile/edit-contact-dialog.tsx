"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPen } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { clientKeys, clientsApi, type ClientContact } from "@/lib/api";
import { presentRequestError, type RequestErrorPresentation } from "@/lib/errors";

import { DialogField, RecordDialog } from "../client-agreements/record-dialog";

const REACHABLE_CHANNEL_ERROR: RequestErrorPresentation = {
  code: "CONTACT_CHANNEL_REQUIRED",
  message: "Enter a phone number or an email address.",
  retryable: false,
  fieldErrors: [],
};

function optionalValue(data: FormData, name: string) {
  const value = String(data.get(name) ?? "").trim();
  return value || null;
}

export function EditContactDialog({
  contact,
  onClose,
}: {
  contact: ClientContact;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [localError, setLocalError] = useState<RequestErrorPresentation | null>(null);
  const updateContact = useMutation({
    mutationFn: clientsApi.updateContact,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: clientKeys.contacts(contact.clientId) }),
        queryClient.invalidateQueries({ queryKey: clientKeys.profile(contact.clientId) }),
      ]);
      onClose();
    },
  });
  const error = localError
    ? localError
    : updateContact.error
      ? presentRequestError(updateContact.error, "Could not save this contact.")
      : null;

  return (
    <RecordDialog
      title="Edit contact"
      description="Update how to reach this person, or make them the primary contact"
      icon={<UserPen className="size-5" />}
      busy={updateContact.isPending}
      submitLabel="Save contact"
      error={error}
      onClose={onClose}
      onSubmit={(form) => {
        const data = new FormData(form);
        const phone = optionalValue(data, "phone");
        const email = optionalValue(data, "email");

        if (!phone && !email) {
          setLocalError(REACHABLE_CHANNEL_ERROR);
          return;
        }

        setLocalError(null);
        updateContact.mutate({
          id: contact.id,
          firstName: String(data.get("firstName") ?? "").trim(),
          lastName: String(data.get("lastName") ?? "").trim(),
          role: optionalValue(data, "role"),
          phone,
          email,
          isPrimary: data.get("isPrimary") === "on",
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <DialogField label="First name">
          <Input required name="firstName" defaultValue={contact.firstName} />
        </DialogField>
        <DialogField label="Last name">
          <Input required name="lastName" defaultValue={contact.lastName} />
        </DialogField>
        <DialogField label="Role">
          <Input name="role" defaultValue={contact.role ?? ""} placeholder="Accounts payable" />
        </DialogField>
        <DialogField label="Phone">
          <Input name="phone" type="tel" defaultValue={contact.phone ?? ""} />
        </DialogField>
        <DialogField label="Email">
          <Input name="email" type="email" defaultValue={contact.email ?? ""} />
        </DialogField>
      </div>
      <label className="text-strong flex items-center gap-2 text-xs font-bold">
        <input
          type="checkbox"
          name="isPrimary"
          defaultChecked={contact.isPrimary}
          className="size-4 rounded border-input accent-primary"
        />
        Primary contact for this client
      </label>
    </RecordDialog>
  );
}
