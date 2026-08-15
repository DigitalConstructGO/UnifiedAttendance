import { Archive, ArchiveRestore, Plus, Trash2 } from "lucide-react";
import type React from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import type { Branch } from "@/lib/api/organization";
import { formatDate } from "@/lib/format-date";
import type { BranchDraft } from "./workspace-model";

type Props = {
  branches: Branch[];
  archivedBranches: Branch[];
  draft: BranchDraft;
  busy: boolean;
  onDraftChange: (draft: BranchDraft) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onManageSchedule: (branchId: string) => void;
  onArchive: (branchId: string) => void;
  onRestore: (branchId: string) => void;
  onDelete: (branchId: string) => void;
};

export function BranchesTab({
  branches,
  archivedBranches,
  draft,
  busy,
  onDraftChange,
  onSubmit,
  onManageSchedule,
  onArchive,
  onRestore,
  onDelete,
}: Props) {
  const [archiving, setArchiving] = useState<Branch | null>(null);
  const [deleting, setDeleting] = useState<Branch | null>(null);

  return (
    <section className="space-y-4">
      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-[18px] bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-border sm:grid-cols-2 xl:grid-cols-[1fr_9rem_1.4fr_1.2fr_auto] xl:items-end"
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
        <BranchField
          label="Timezone"
          value={draft.timezone}
          placeholder="Africa/Addis_Ababa"
          onChange={(timezone) => onDraftChange({ ...draft, timezone })}
        />
        <label className="text-strong space-y-2 text-xs font-bold">
          Grace period (minutes)
          <Input
            type="number"
            min={0}
            required
            value={draft.graceMinutes}
            onChange={(event) =>
              onDraftChange({ ...draft, graceMinutes: Number(event.target.value) })
            }
          />
        </label>
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
                  <span className="block">
                    {branch.timezone} · {branch.graceMinutes}m grace
                  </span>
                </p>
              </div>
              <span className="rounded-full bg-success/10 px-2 py-1 text-[0.6875rem] font-bold text-success">
                {branch.status}
              </span>
            </div>
            <div className="mt-5 flex flex-wrap items-center gap-2">
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
                    timezone: branch.timezone,
                    graceMinutes: branch.graceMinutes,
                  })
                }
              >
                Edit
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`Archive ${branch.name}`}
                className="ml-auto text-destructive hover:text-destructive"
                onClick={() => setArchiving(branch)}
              >
                <Archive aria-hidden="true" />
              </Button>
            </div>
          </article>
        ))}
      </div>

      {archivedBranches.length > 0 ? (
        <section className="grid gap-3">
          <h3 className="mt-2 text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">
            Archived branches
          </h3>
          {archivedBranches.map((branch) => (
            <article
              key={branch.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-[var(--surface-subtle)] p-5 ring-1 ring-border"
            >
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-muted-foreground">{branch.name}</h4>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {branch.code} · archived {formatDate(branch.archivedAt)}
                </p>
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-[9px] font-bold"
                  disabled={busy}
                  onClick={() => onRestore(branch.id)}
                >
                  <ArchiveRestore aria-hidden="true" />
                  Restore
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-[9px] font-bold text-destructive hover:text-destructive"
                  onClick={() => setDeleting(branch)}
                >
                  <Trash2 aria-hidden="true" />
                  Delete forever
                </Button>
              </div>
            </article>
          ))}
        </section>
      ) : null}

      {archiving ? (
        <ConfirmDialog
          title={`Archive ${archiving.name}?`}
          description="It moves out of the active branches and out of every branch picker in the app. You can restore it at any time."
          confirmLabel="Archive branch"
          onCancel={() => setArchiving(null)}
          onConfirm={() => {
            onArchive(archiving.id);
            setArchiving(null);
          }}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={`Delete ${deleting.name} forever?`}
          description="This permanently erases the branch, its schedule, and its holidays, and cannot be undone. A branch with employees or enrolled devices still on it will refuse to go — move or remove those first."
          confirmLabel="Delete forever"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            onDelete(deleting.id);
            setDeleting(null);
          }}
        />
      ) : null}
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
