"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Archive, EllipsisVertical, Star, UserPen, UsersRound } from "lucide-react";
import { useState } from "react";

import { useAccess } from "@/components/access-provider";
import { RequestErrorAlert } from "@/components/request-error-alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { clientKeys, clientsApi, type ClientContact } from "@/lib/api";
import { personName } from "@/lib/client-presentation";
import { presentRequestError } from "@/lib/errors";

import { EditContactDialog } from "./edit-contact-dialog";
import { EmptyState, TabPanel } from "./tab-shell";

export function ContactsTab({ contacts }: { contacts: ClientContact[] }) {
  const { can } = useAccess();
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ClientContact | null>(null);
  const [archiving, setArchiving] = useState<ClientContact | null>(null);

  const editable = can("client_contacts.update");
  const archivable = can("client_contacts.archive");

  async function refresh(clientId: string) {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: clientKeys.contactsAll }),
      queryClient.invalidateQueries({ queryKey: clientKeys.profile(clientId) }),
    ]);
  }

  const makePrimary = useMutation({
    mutationFn: (contact: ClientContact) =>
      clientsApi.updateContact({ id: contact.id, isPrimary: true }),
    onSuccess: (contact) => refresh(contact.clientId),
  });
  const archiveContact = useMutation({
    mutationFn: (contact: ClientContact) => clientsApi.archiveContact(contact.id),
    onSuccess: (contact) => refresh(contact.clientId),
  });

  const writeError = makePrimary.error ?? archiveContact.error;

  if (contacts.length === 0) {
    return (
      <TabPanel>
        <EmptyState
          icon={<UsersRound className="size-5" aria-hidden="true" />}
          title="No contacts yet"
          hint="Add the people you deal with at this client. One of them can be marked primary."
        />
      </TabPanel>
    );
  }

  return (
    <div className="grid gap-3">
      {writeError ? (
        <RequestErrorAlert
          error={presentRequestError(writeError, "Could not change this contact.")}
        />
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {contacts.map((contact) => (
          <TabPanel key={contact.id} className="p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-strong text-sm font-bold">{personName(contact)}</p>
                {contact.role ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{contact.role}</p>
                ) : null}
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {contact.isPrimary ? (
                  <span className="rounded-full bg-success/10 px-2.5 py-1 text-[0.625rem] font-bold text-success">
                    Primary
                  </span>
                ) : null}
                {editable || archivable ? (
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label={`Manage ${personName(contact)}`}
                        />
                      }
                    >
                      <EllipsisVertical aria-hidden="true" />
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      {editable ? (
                        <DropdownMenuItem onClick={() => setEditing(contact)}>
                          <UserPen aria-hidden="true" />
                          Edit contact
                        </DropdownMenuItem>
                      ) : null}
                      {editable && !contact.isPrimary ? (
                        <DropdownMenuItem onClick={() => makePrimary.mutate(contact)}>
                          <Star aria-hidden="true" />
                          Make primary
                        </DropdownMenuItem>
                      ) : null}
                      {archivable ? (
                        <>
                          {editable ? <DropdownMenuSeparator /> : null}
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={() => setArchiving(contact)}
                          >
                            <Archive aria-hidden="true" />
                            Archive contact
                          </DropdownMenuItem>
                        </>
                      ) : null}
                    </DropdownMenuContent>
                  </DropdownMenu>
                ) : null}
              </div>
            </div>
            <dl className="mt-3 grid gap-1.5 text-xs text-muted-foreground">
              {contact.phone ? (
                <div className="flex gap-2">
                  <dt className="sr-only">Phone</dt>
                  <dd>{contact.phone}</dd>
                </div>
              ) : null}
              {contact.email ? (
                <div className="flex gap-2">
                  <dt className="sr-only">Email</dt>
                  <dd className="break-all">{contact.email}</dd>
                </div>
              ) : null}
            </dl>
          </TabPanel>
        ))}
      </div>

      {editing ? <EditContactDialog contact={editing} onClose={() => setEditing(null)} /> : null}

      {archiving ? (
        <ConfirmDialog
          title={`Archive ${personName(archiving)}?`}
          description="They leave this client's contact list and lose the primary badge if they held it. The record itself is kept."
          confirmLabel="Archive contact"
          onCancel={() => setArchiving(null)}
          onConfirm={() => {
            archiveContact.mutate(archiving);
            setArchiving(null);
          }}
        />
      ) : null}
    </div>
  );
}
