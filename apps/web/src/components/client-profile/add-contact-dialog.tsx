"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { clientKeys, clientsApi } from "@/lib/api";
import { presentRequestError, type RequestErrorPresentation } from "@/lib/errors";

import { DialogField, RecordDialog } from "../client-agreements/record-dialog";

const REACHABLE_CHANNEL_ERROR: RequestErrorPresentation = {
  code: "CONTACT_CHANNEL_REQUIRED",
  message: "Enter a phone number, email address, or Telegram handle.",
  retryable: false,
  fieldErrors: [],
};

function optionalValue(data: FormData, name: string) {
  const value = String(data.get(name) ?? "").trim();
  return value || null;
}

export function AddContactDialog({ clientId, onClose }: { clientId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [localError, setLocalError] = useState<RequestErrorPresentation | null>(null);
  const createContact = useMutation({
    mutationFn: clientsApi.createContact,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: clientKeys.contacts(clientId) }),
        queryClient.invalidateQueries({ queryKey: clientKeys.profile(clientId) }),
      ]);
      onClose();
    },
  });
  const error = localError
    ? localError
    : createContact.error
      ? presentRequestError(createContact.error, "Could not create this contact.")
      : null;

  return (
    <RecordDialog
      title="Add contact"
      description="Add a person connected to this client"
      icon={<UserPlus className="size-5" />}
      busy={createContact.isPending}
      submitLabel="Add contact"
      error={error}
      onClose={onClose}
      onSubmit={(form) => {
        const data = new FormData(form);
        const phone = optionalValue(data, "phone");
        const email = optionalValue(data, "email");
        const telegramHandle = optionalValue(data, "telegramHandle");

        if (!phone && !email && !telegramHandle) {
          setLocalError(REACHABLE_CHANNEL_ERROR);
          return;
        }

        setLocalError(null);
        createContact.mutate({
          clientId,
          firstName: String(data.get("firstName") ?? "").trim(),
          middleName: optionalValue(data, "middleName"),
          lastName: String(data.get("lastName") ?? "").trim(),
          role: optionalValue(data, "role"),
          phone,
          email,
          telegramHandle,
          isPrimary: data.get("isPrimary") === "on",
        });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <DialogField label="First name">
          <Input required name="firstName" autoComplete="given-name" />
        </DialogField>
        <DialogField label="Middle name">
          <Input name="middleName" autoComplete="additional-name" />
        </DialogField>
        <DialogField label="Last name">
          <Input required name="lastName" autoComplete="family-name" />
        </DialogField>
        <DialogField label="Role">
          <Input name="role" placeholder="Accounts payable" />
        </DialogField>
        <DialogField label="Phone">
          <Input name="phone" type="tel" autoComplete="tel" />
        </DialogField>
        <DialogField label="Email">
          <Input name="email" type="email" autoComplete="email" />
        </DialogField>
      </div>
      <DialogField label="Telegram handle">
        <Input name="telegramHandle" placeholder="@username" />
      </DialogField>
      <label className="text-strong flex items-center gap-2 text-xs font-bold">
        <input
          type="checkbox"
          name="isPrimary"
          className="size-4 rounded border-input accent-primary"
        />
        Make this the primary contact
      </label>
    </RecordDialog>
  );
}
