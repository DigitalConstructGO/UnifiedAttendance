import { Plus, Trash2 } from "lucide-react";
import type React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Branch, Holiday } from "@/lib/api/organization";

type Props = {
  branches: Branch[];
  holidays: Holiday[];
  busy: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onDelete: (id: string) => void;
};

export function HolidaysTab({ branches, holidays, busy, onSubmit, onDelete }: Props) {
  return (
    <section className="space-y-4">
      <form
        onSubmit={onSubmit}
        className="grid gap-3 rounded-[18px] bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-border sm:grid-cols-[1fr_10rem_12rem_auto] sm:items-end"
      >
        <label className="text-strong space-y-2 text-xs font-bold">
          Holiday name
          <Input name="name" required placeholder="Public holiday" />
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
          holidays.map((holiday) => (
            <div key={holiday.id} className="flex items-center justify-between gap-3 py-4">
              <div>
                <p className="text-strong text-sm font-semibold">{holiday.name}</p>
                <p className="text-xs text-muted-foreground">
                  {holiday.holidayDate}
                  {holiday.branchId ? " · Branch holiday" : " · All branches"}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Remove ${holiday.name}`}
                onClick={() => onDelete(holiday.id)}
                disabled={busy}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          ))
        ) : (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No holidays configured yet.
          </p>
        )}
      </div>
    </section>
  );
}
