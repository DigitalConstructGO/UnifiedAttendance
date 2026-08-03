import { Send, UsersRound } from "lucide-react";

import type { ClientContact } from "@/lib/api";
import { personName } from "@/lib/client-presentation";

import { EmptyState, TabPanel } from "./tab-shell";

export function ContactsTab({ contacts }: { contacts: ClientContact[] }) {
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
            {contact.isPrimary ? (
              <span className="shrink-0 rounded-full bg-success/10 px-2.5 py-1 text-[0.625rem] font-bold text-success">
                Primary
              </span>
            ) : null}
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
  );
}
