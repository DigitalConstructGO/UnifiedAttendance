import { Plus, Save, X } from "lucide-react";
import type React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { TierDraft } from "./tier-model";

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
            onChange={(event) =>
              onDraftChange({ ...draft, threshold: Number(event.target.value) })
            }
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
      <label className="text-strong space-y-2 text-xs font-bold">
        Email body
        <textarea
          required
          className={textareaClass}
          value={draft.bodyTemplate}
          placeholder="Hi {{employeeName}}, ..."
          onChange={(event) => onDraftChange({ ...draft, bodyTemplate: event.target.value })}
        />
        <span className="block font-normal text-muted-foreground">
          Placeholders: {"{{employeeName}}"}, {"{{lateMinutes}}"}, {"{{occurrenceCount}}"},{" "}
          {"{{date}}"}, {"{{branchName}}"}
        </span>
      </label>
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
