import { Plus } from "lucide-react";
import type React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Branch } from "@/lib/api/organization";
import type { BranchDraft } from "./types";

type Props = {
  branches: Branch[];
  draft: BranchDraft;
  busy: boolean;
  onDraftChange: (draft: BranchDraft) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onManageSchedule: (branchId: string) => void;
};

export function BranchesTab({
  branches,
  draft,
  busy,
  onDraftChange,
  onSubmit,
  onManageSchedule,
}: Props) {
  return (
    <section className="space-y-4">
      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-[18px] bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-border sm:grid-cols-[1fr_9rem_1.5fr_auto] sm:items-end"
      >
        <BranchField
          label="Name"
          value={draft.name}
          placeholder="Branch name"
          onChange={(name) => onDraftChange({ ...draft, name })}
        />
        <BranchField
          label="Code"
          value={draft.code}
          placeholder="HQ"
          pattern="[A-Za-z0-9-]{2,20}"
          onChange={(code) => onDraftChange({ ...draft, code })}
        />
        <BranchField
          label="Address"
          value={draft.address}
          placeholder="Street, city, country"
          onChange={(address) => onDraftChange({ ...draft, address })}
        />
        <Button type="submit" className="h-8 rounded-[9px] font-bold" disabled={busy}>
          <Plus className="size-4" />
          {draft.id ? "Save" : "Add"}
        </Button>
      </form>
      <div className="grid gap-4 md:grid-cols-2">
        {branches.map((branch) => (
          <article
            key={branch.id}
            className="rounded-[18px] bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-border"
          >
            <div className="flex items-start justify-between">
              <div>
                <h2 className="text-strong font-heading font-bold">{branch.name}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {branch.code} · {branch.address}
                </p>
              </div>
              <span className="rounded-full bg-success/10 px-2 py-1 text-[0.6875rem] font-bold text-success">
                {branch.status}
              </span>
            </div>
            <div className="mt-5 flex gap-2">
              <Button
                variant="outline"
                className="h-9 rounded-[11px] text-xs"
                onClick={() => onManageSchedule(branch.id)}
              >
                Manage schedule
              </Button>
              <Button
                variant="ghost"
                className="h-9 rounded-[11px] text-xs"
                onClick={() =>
                  onDraftChange({
                    id: branch.id,
                    name: branch.name,
                    code: branch.code,
                    address: branch.address ?? "",
                  })
                }
              >
                Edit
              </Button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function BranchField({
  label,
  value,
  placeholder,
  pattern,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  pattern?: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-strong space-y-2 text-xs font-bold">
      {label}
      <Input
        required
        pattern={pattern}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
