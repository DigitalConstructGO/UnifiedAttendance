import { Check, Pencil, Plus, RefreshCw, Trash2, X } from "lucide-react";
import type React from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import type { Branch, Holiday } from "@/lib/api/organization";

type Props = {
  branches: Branch[];
  holidays: Holiday[];
  busy: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onDelete: (id: string) => void;
  onChangeDate: (id: string, holidayDate: string) => void;
  onSync: () => void;
};

export function HolidaysTab({
  branches,
  holidays,
  busy,
  onSubmit,
  onDelete,
  onChangeDate,
  onSync,
}: Props) {
  const [deleting, setDeleting] = useState<Holiday | null>(null);
  const [editing, setEditing] = useState<{ id: string; date: string } | null>(null);
  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-border">
        <div>
          <p className="text-strong text-sm font-semibold">Ethiopian public holidays</p>
          <p className="text-xs text-muted-foreground">
            Ethiopian holidays are added automatically for this year and the next. Edit dates if
            observed days change.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-8 rounded-[9px] font-bold"
          onClick={onSync}
          disabled={busy}
        >
          <RefreshCw className="size-4" />
          Sync now
        </Button>
      </div>
      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-[18px] bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-border sm:grid-cols-[1fr_10rem_12rem_auto] sm:items-end"
      >
        <label className="text-strong space-y-2 text-xs font-bold">
          Holiday name
          <Input name="name" required placeholder="Company holiday" />
        </label>
        <label className="text-strong space-y-2 text-xs font-bold">
          Date
          <Input name="date" required type="date" />
        </label>
        <label className="text-strong space-y-2 text-xs font-bold">
          Branch
          <select
            name="branchId"
            className="h-8 w-full rounded-none border border-input bg-background px-2.5 text-xs"
          >
            <option value="">All branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </label>
        <Button type="submit" className="h-8 rounded-[9px] font-bold" disabled={busy}>
          <Plus className="size-4" />
          Add
        </Button>
      </form>
      <div className="divide-y divide-border rounded-[18px] bg-card px-5 shadow-[var(--shadow-card)] ring-1 ring-border">
        {holidays.length ? (
          holidays.map((holiday) => {
            const generated = holiday.source === "auto";
            const isEditing = editing?.id === holiday.id;
            return (
              <div key={holiday.id} className="flex items-center justify-between gap-3 py-4">
                <div>
                  <p className="text-strong flex items-center gap-2 text-sm font-semibold">
                    {holiday.name}
                    {generated ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                        Auto · Ethiopian calendar
                      </span>
                    ) : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {holiday.holidayDate}
                    {holiday.ethiopianDate ? ` · ${holiday.ethiopianDate} E.C.` : ""}
                    {holiday.branchId ? " · Branch holiday" : " · All branches"}
                  </p>
                </div>
                {generated ? (
                  isEditing ? (
                    <div className="flex items-center gap-1">
                      <Input
                        type="date"
                        aria-label={`New date for ${holiday.name}`}
                        className="h-8 w-40"
                        value={editing.date}
                        onChange={(event) =>
                          setEditing({ id: holiday.id, date: event.target.value })
                        }
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Save date for ${holiday.name}`}
                        disabled={busy || !editing.date}
                        onClick={() => {
                          onChangeDate(holiday.id, editing.date);
                          setEditing(null);
                        }}
                      >
                        <Check className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Cancel"
                        onClick={() => setEditing(null)}
                      >
                        <X className="size-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label={`Edit date of ${holiday.name}`}
                      onClick={() => setEditing({ id: holiday.id, date: holiday.holidayDate })}
                      disabled={busy}
                    >
                      <Pencil className="size-4" />
                    </Button>
                  )
                ) : (
                  <Button
                    variant="ghost"
                    size="icon"
                    aria-label={`Remove ${holiday.name}`}
                    onClick={() => setDeleting(holiday)}
                    disabled={busy}
                  >
                    <Trash2 className="size-4 text-destructive" />
                  </Button>
                )}
              </div>
            );
          })
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            Ethiopian public holidays are added automatically; add company-specific days here.
          </p>
        )}
      </div>

      {deleting ? (
        <ConfirmDialog
          title={`Remove ${deleting.name}?`}
          description={`${deleting.holidayDate} counts as a normal working day again, and attendance for it is recalculated.`}
          confirmLabel="Remove holiday"
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
