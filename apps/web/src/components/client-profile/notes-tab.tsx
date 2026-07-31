import { MessageSquare, Pin } from "lucide-react";

import type { ClientNoteRow } from "@/lib/api";
import { initials, personName } from "@/lib/client-presentation";
import { ethiopianDate } from "@/lib/ethiopian-date";

import { EmptyState, TabPanel } from "./tab-shell";

export function NotesTab({ notes, timeZone }: { notes: ClientNoteRow[]; timeZone: string }) {
  if (notes.length === 0) {
    return (
      <TabPanel>
        <EmptyState
          icon={<MessageSquare className="size-5" aria-hidden="true" />}
          title="No notes yet"
          hint="Internal relationship notes and pinned reminders will appear here."
        />
      </TabPanel>
    );
  }

  return (
    <div className="grid gap-3">
      {notes.map(({ note, author }) => (
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
                  {ethiopianDate(note.createdAt, timeZone)}
                </time>
              </p>
            </div>
            {note.isPinned ? (
              <span className="inline-flex shrink-0 items-center gap-1.5 text-xs font-bold text-warning">
                <Pin className="size-4" aria-hidden="true" />
                Pinned
              </span>
            ) : null}
          </div>
          <p className="text-strong mt-3 text-sm leading-relaxed">{note.body}</p>
        </TabPanel>
      ))}
    </div>
  );
}
