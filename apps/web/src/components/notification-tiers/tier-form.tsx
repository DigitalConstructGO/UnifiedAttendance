import { Plus, Save, X } from "lucide-react";
import { useRef } from "react";
import type React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { insertPlaceholder, placeholdersFor, type TierDraft } from "./tier-model";

type Props = {
  draft: TierDraft;
  editing: boolean;
  busy: boolean;
  onDraftChange: (draft: TierDraft) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
};

const textareaClass =
  "min-h-24 w-full min-w-0 rounded-none border border-input bg-transparent px-2.5 py-2 text-xs transition-colors outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50";

export function TierForm({ draft, editing, busy, onDraftChange, onSubmit, onCancel }: Props) {
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  // Splice the token where the person was typing, then put the caret after it
  // so the next click or keystroke continues from there.
  function insert(token: string) {
    const body = bodyRef.current;
    const cursor = body ? { start: body.selectionStart, end: body.selectionEnd } : null;
    const next = insertPlaceholder(draft.bodyTemplate, cursor, token);
    onDraftChange({ ...draft, bodyTemplate: next.text });
    requestAnimationFrame(() => {
      body?.focus();
      body?.setSelectionRange(next.cursor, next.cursor);
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="grid gap-3 rounded-[18px] bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-border"
    >
      <div className="grid gap-3 sm:grid-cols-[9rem_1fr]">
        <label className="text-strong space-y-2 text-xs font-bold">
          Weekly occurrences ≥
          <Input
            type="number"
            min={1}
            required
            value={draft.threshold}
            onChange={(event) => onDraftChange({ ...draft, threshold: Number(event.target.value) })}
          />
        </label>
        <label className="text-strong space-y-2 text-xs font-bold">
          Email subject
          <Input
            required
            value={draft.subjectTemplate}
            placeholder="Attendance Notice"
            onChange={(event) => onDraftChange({ ...draft, subjectTemplate: event.target.value })}
          />
        </label>
      </div>
      <div className="space-y-2">
        <label htmlFor="tier-body" className="text-strong block text-xs font-bold">
          Email body
        </label>
        <textarea
          id="tier-body"
          ref={bodyRef}
          required
          className={textareaClass}
          value={draft.bodyTemplate}
          placeholder="Hi there, ..."
          onChange={(event) => onDraftChange({ ...draft, bodyTemplate: event.target.value })}
        />
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Insert:</span>
          {placeholdersFor(draft.condition).map((placeholder) => (
            <Button
              key={placeholder.token}
              type="button"
              variant="outline"
              size="xs"
              aria-label={`Insert ${placeholder.label}`}
              disabled={busy}
              onClick={() => insert(placeholder.token)}
            >
              {placeholder.label}
            </Button>
          ))}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button type="submit" className="h-8 rounded-[9px] font-bold" disabled={busy}>
          {editing ? <Save className="size-4" /> : <Plus className="size-4" />}
          {editing ? "Save tier" : "Add tier"}
        </Button>
        {editing ? (
          <Button
            type="button"
            variant="ghost"
            className="h-8 rounded-[9px] font-bold"
            onClick={onCancel}
            disabled={busy}
          >
            <X className="size-4" />
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
