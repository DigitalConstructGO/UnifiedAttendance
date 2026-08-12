"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Pencil, Pin, Trash2 } from "lucide-react";
import { useState } from "react";

import { useAccess } from "@/components/access-provider";
import { RequestErrorAlert } from "@/components/request-error-alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { clientKeys, clientsApi, workforceQueries, type ClientNoteRow } from "@/lib/api";
import { initials, personName } from "@/lib/client-presentation";
import { presentRequestError } from "@/lib/errors";
import { formatDate } from "@/lib/format-date";

import { DialogField, dialogFieldClass, RecordDialog } from "../client-agreements/record-dialog";
import { EmptyState, TabPanel } from "./tab-shell";

export function NotesTab({
  notes,
  timeZone,
  clientId,
  branchId,
  ownerEmployeeId,
}: {
  notes: ClientNoteRow[];
  timeZone: string;
  clientId: string;
  branchId: string;
  ownerEmployeeId: string;
}) {
  const { can } = useAccess();
  const manageable = can("client_engagement.manage");
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<ClientNoteRow | null>(null);
  const [archiving, setArchiving] = useState<ClientNoteRow | null>(null);

  const employeesQuery = useQuery({
    ...workforceQueries.employees(branchId),
    enabled: manageable,
  });
  const employees = employeesQuery.data ?? [];

  async function refresh() {
    await queryClient.invalidateQueries({ queryKey: clientKeys.notesAll });
  }

  const createNote = useMutation({
    mutationFn: clientsApi.createNote,
    onSuccess: refresh,
  });
  const updateNote = useMutation({
    mutationFn: clientsApi.updateNote,
    onSuccess: async () => {
      setEditing(null);
      await refresh();
    },
  });
  const archiveNote = useMutation({
    mutationFn: clientsApi.archiveNote,
    onSuccess: refresh,
  });

  const writeError = createNote.error ?? archiveNote.error;

  const composer = manageable ? (
    <TabPanel className="p-5">
      <form
        className="grid gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const data = new FormData(form);
          createNote.mutate(
            {
              clientId,
              authorEmployeeId: String(data.get("authorEmployeeId")),
              body: String(data.get("body") ?? "").trim(),
              isPinned: data.get("isPinned") === "on",
            },
            { onSuccess: () => form.reset() },
          );
        }}
      >
        <DialogField label="New note">
          <textarea
            required
            name="body"
            rows={3}
            placeholder="What happened with this client, for the next person who opens this page"
            className={`${dialogFieldClass} h-auto min-h-20 py-2.5 leading-relaxed`}
          />
        </DialogField>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <DialogField label="As">
            <select
              required
              name="authorEmployeeId"
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
          <div className="flex items-center gap-4">
            <label className="text-strong flex items-center gap-2 text-xs font-bold">
              <input type="checkbox" name="isPinned" className="size-4 accent-primary" />
              Pin it
            </label>
            <Button disabled={createNote.isPending} className="h-10 rounded-[11px] px-4 font-bold">
              {createNote.isPending ? "Saving…" : "Add note"}
            </Button>
          </div>
        </div>
      </form>
    </TabPanel>
  ) : null;

  return (
    <div className="grid gap-3">
      {composer}
      {writeError ? (
        <RequestErrorAlert error={presentRequestError(writeError, "Could not save the note.")} />
      ) : null}

      {notes.length === 0 ? (
        <TabPanel>
          <EmptyState
            icon={<MessageSquare className="size-5" aria-hidden="true" />}
            title="No notes yet"
            hint="Internal relationship notes and pinned reminders will appear here."
          />
        </TabPanel>
      ) : (
        notes.map((row) => {
          const { note, author } = row;
          return (
            <TabPanel key={note.id} className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    aria-hidden="true"
                    className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-muted text-[0.6875rem] font-bold text-muted-foreground"
                  >
                    {initials(personName(author.person))}
                  </span>
                  <p className="text-strong text-xs font-bold">
                    {personName(author.person)}
                    <time className="ml-2 font-medium text-muted-foreground">
                      {formatDate(note.createdAt, timeZone)}
                    </time>
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {note.isPinned ? (
                    <span className="inline-flex items-center gap-1.5 text-xs font-bold text-warning">
                      <Pin className="size-4" aria-hidden="true" />
                      Pinned
                    </span>
                  ) : null}
                  {manageable ? (
                    <>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Edit note"
                        onClick={() => setEditing(row)}
                      >
                        <Pencil aria-hidden="true" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label="Archive note"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setArchiving(row)}
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </>
                  ) : null}
                </div>
              </div>
              <p className="text-strong mt-3 text-sm leading-relaxed">{note.body}</p>
            </TabPanel>
          );
        })
      )}

      {editing ? (
        <RecordDialog
          title="Edit note"
          description={`By ${personName(editing.author.person)}`}
          icon={<MessageSquare className="size-5" />}
          busy={updateNote.isPending}
          submitLabel="Save note"
          error={
            updateNote.error
              ? presentRequestError(updateNote.error, "Could not save the note.")
              : null
          }
          onClose={() => setEditing(null)}
          onSubmit={(form) => {
            const data = new FormData(form);
            updateNote.mutate({
              id: editing.note.id,
              body: String(data.get("body") ?? "").trim(),
              isPinned: data.get("isPinned") === "on",
            });
          }}
        >
          <DialogField label="Note">
            <textarea
              required
              name="body"
              rows={4}
              defaultValue={editing.note.body}
              className={`${dialogFieldClass} h-auto min-h-24 py-2.5 leading-relaxed`}
            />
          </DialogField>
          <label className="text-strong flex items-center gap-2 text-xs font-bold">
            <input
              type="checkbox"
              name="isPinned"
              defaultChecked={editing.note.isPinned}
              className="size-4 accent-primary"
            />
            Pinned
          </label>
        </RecordDialog>
      ) : null}

      {archiving ? (
        <ConfirmDialog
          title="Archive this note?"
          description="It leaves the notes list. The record itself is kept."
          confirmLabel="Archive note"
          onCancel={() => setArchiving(null)}
          onConfirm={() => {
            archiveNote.mutate(archiving.note.id);
            setArchiving(null);
          }}
        />
      ) : null}
    </div>
  );
}
