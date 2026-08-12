"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, PhoneCall, Trash2 } from "lucide-react";
import { useState } from "react";

import { useAccess } from "@/components/access-provider";
import { RequestErrorAlert } from "@/components/request-error-alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import {
  clientKeys,
  clientQueries,
  clientsApi,
  workforceQueries,
  type CrmActivityRow,
} from "@/lib/api";
import { personName } from "@/lib/client-presentation";
import { presentRequestError } from "@/lib/errors";
import { formatDate } from "@/lib/format-date";

import { DialogField, dialogFieldClass, RecordDialog } from "../client-agreements/record-dialog";
import { EmptyState, TabPanel } from "./tab-shell";

function dateInputValue(value: string | Date) {
  return new Date(value).toISOString().slice(0, 10);
}

export function ActivitiesTab({
  activities,
  timeZone,
  clientId,
  branchId,
  ownerEmployeeId,
}: {
  activities: CrmActivityRow[];
  timeZone: string;
  clientId: string;
  branchId: string;
  ownerEmployeeId: string;
}) {
  const { can } = useAccess();
  const manageable = can("client_engagement.manage");
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<CrmActivityRow | null>(null);
  const [deleting, setDeleting] = useState<CrmActivityRow | null>(null);

  const employeesQuery = useQuery({
    ...workforceQueries.employees(branchId),
    enabled: manageable,
  });
  const employees = employeesQuery.data ?? [];
  const contactsQuery = useQuery({
    ...clientQueries.contacts(clientId),
    enabled: manageable,
  });
  const contacts = contactsQuery.data ?? [];

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: clientKeys.activitiesAll }),
      queryClient.invalidateQueries({ queryKey: clientKeys.profile(clientId) }),
    ]);
  }

  const createActivity = useMutation({
    mutationFn: clientsApi.createActivity,
    onSuccess: refresh,
  });
  const updateActivity = useMutation({
    mutationFn: clientsApi.updateActivity,
    onSuccess: async () => {
      setEditing(null);
      await refresh();
    },
  });
  const deleteActivity = useMutation({
    mutationFn: clientsApi.deleteActivity,
    onSuccess: refresh,
  });

  const writeError = createActivity.error ?? deleteActivity.error;

  const composer = manageable ? (
    <TabPanel className="p-5">
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          const contactId = String(data.get("clientContactId") ?? "");
          createActivity.mutate(
            {
              clientId,
              clientContactId: contactId || null,
              actorEmployeeId: String(data.get("actorEmployeeId")),
              note: String(data.get("note") ?? "").trim(),
              contactDate: String(data.get("contactDate")),
            },
            { onSuccess: () => form.reset() },
          );
        }}
      >
        <DialogField label="What happened">
          <textarea
            required
            name="note"
            rows={2}
            placeholder="Called about the pending invoice, met on site, sent the proposal…"
            className={`${dialogFieldClass} h-auto min-h-16 py-2.5 leading-relaxed`}
          />
        </DialogField>
        <div className="grid gap-3 sm:grid-cols-3">
          <DialogField label="With contact">
            <select name="clientContactId" className={dialogFieldClass} defaultValue="">
              <option value="">General — no specific contact</option>
              {contacts.map((contact) => (
                <option key={contact.id} value={contact.id}>
                  {personName(contact)}
                </option>
              ))}
            </select>
          </DialogField>
          <DialogField label="By">
            <select
              required
              name="actorEmployeeId"
              className={dialogFieldClass}
              defaultValue={ownerEmployeeId}
            >
              {employees.map((row) => (
                <option key={row.employee.id} value={row.employee.id}>
                  {personName(row.person)}
                </option>
              ))}
            </select>
          </DialogField>
          <DialogField label="On">
            <Input
              required
              name="contactDate"
              type="date"
              className={dialogFieldClass}
              defaultValue={dateInputValue(new Date())}
            />
          </DialogField>
        </div>
        <div className="flex justify-end">
          <Button
            disabled={createActivity.isPending}
            className="h-10 rounded-[11px] px-4 font-bold"
          >
            {createActivity.isPending ? "Saving…" : "Log activity"}
          </Button>
        </div>
      </form>
    </TabPanel>
  ) : null;

  return (
    <div className="grid gap-3">
      {composer}
      {writeError ? (
        <RequestErrorAlert
          error={presentRequestError(writeError, "Could not save the activity.")}
        />
      ) : null}

      {activities.length === 0 ? (
        <TabPanel>
          <EmptyState
            icon={<PhoneCall className="size-5" aria-hidden="true" />}
            title="No activities recorded"
            hint="Calls, meetings, emails, and site visits will appear here."
          />
        </TabPanel>
      ) : (
        <TabPanel className="px-5 py-2">
          <ol className="divide-y divide-border">
            {activities.map((row) => {
              const { activity, actor, clientContact } = row;
              return (
                <li key={activity.id} className="flex items-start gap-3 py-4">
                  <span
                    aria-hidden="true"
                    className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[var(--surface-subtle)] text-info"
                  >
                    <PhoneCall className="size-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-strong text-sm font-bold">
                      {clientContact ? (
                        <span>Contact: {personName(clientContact)}</span>
                      ) : (
                        <span>General Contact</span>
                      )}
                      <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                        · Logged by {personName(actor.person)}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{activity.note}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <time className="text-xs text-muted-foreground">
                      {formatDate(activity.contactDate, timeZone)}
                    </time>
                    {manageable ? (
                      <>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Edit activity"
                          onClick={() => setEditing(row)}
                        >
                          <Pencil aria-hidden="true" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Delete activity"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleting(row)}
                        >
                          <Trash2 aria-hidden="true" />
                        </Button>
                      </>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ol>
        </TabPanel>
      )}

      {editing ? (
        <RecordDialog
          title="Edit activity"
          description={`Logged by ${personName(editing.actor.person)}`}
          icon={<PhoneCall className="size-5" />}
          busy={updateActivity.isPending}
          submitLabel="Save activity"
          error={
            updateActivity.error
              ? presentRequestError(updateActivity.error, "Could not save the activity.")
              : null
          }
          onClose={() => setEditing(null)}
          onSubmit={(form) => {
            const data = new FormData(form);
            const contactId = String(data.get("clientContactId") ?? "");
            updateActivity.mutate({
              id: editing.activity.id,
              note: String(data.get("note") ?? "").trim(),
              contactDate: String(data.get("contactDate")),
              clientContactId: contactId || null,
            });
          }}
        >
          <DialogField label="What happened">
            <textarea
              required
              name="note"
              rows={3}
              defaultValue={editing.activity.note}
              className={`${dialogFieldClass} h-auto min-h-20 py-2.5 leading-relaxed`}
            />
          </DialogField>
          <div className="grid gap-4 sm:grid-cols-2">
            <DialogField label="With contact">
              <select
                name="clientContactId"
                className={dialogFieldClass}
                defaultValue={editing.activity.clientContactId ?? ""}
              >
                <option value="">General — no specific contact</option>
                {contacts.map((contact) => (
                  <option key={contact.id} value={contact.id}>
                    {personName(contact)}
                  </option>
                ))}
              </select>
            </DialogField>
            <DialogField label="On">
              <Input
                required
                name="contactDate"
                type="date"
                className={dialogFieldClass}
                defaultValue={dateInputValue(editing.activity.contactDate)}
              />
            </DialogField>
          </div>
        </RecordDialog>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title="Delete this activity?"
          description="It disappears from the log for good. This cannot be undone."
          confirmLabel="Delete activity"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleteActivity.mutate(deleting.activity.id);
            setDeleting(null);
          }}
        />
      ) : null}
    </div>
  );
}
