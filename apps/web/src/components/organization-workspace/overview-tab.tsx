import { Building2, Save } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  name: string;
  code: string;
  timezone: string;
  busy: boolean;
  onNameChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onTimezoneChange: (value: string) => void;
  onSave: () => void;
};

export function OverviewTab({
  name,
  code,
  timezone,
  busy,
  onNameChange,
  onCodeChange,
  onTimezoneChange,
  onSave,
}: Props) {
  return (
    <section className="rounded-[18px] bg-card p-6 shadow-[var(--shadow-card)] ring-1 ring-border">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-[11px] bg-workflow/10 text-workflow">
          <Building2 className="size-5" />
        </span>
        <div>
          <h2 className="text-strong font-heading font-bold">Organization details</h2>
          <p className="text-xs text-muted-foreground">
            The timezone controls branch schedules and attendance calculations.
          </p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-strong space-y-2 text-xs font-bold">
          Name
          <Input value={name} onChange={(event) => onNameChange(event.target.value)} />
        </label>
        <label className="text-strong space-y-2 text-xs font-bold">
          Code
          <Input
            pattern="[A-Za-z0-9-]{2,20}"
            value={code}
            onChange={(event) => onCodeChange(event.target.value)}
          />
        </label>
        <label className="text-strong space-y-2 text-xs font-bold sm:col-span-2">
          Timezone
          <Input
            required
            value={timezone}
            onChange={(event) => onTimezoneChange(event.target.value)}
            placeholder="e.g. Africa/Addis_Ababa"
          />
        </label>
      </div>
      <Button className="mt-5 h-10 rounded-[11px] font-bold" onClick={onSave} disabled={busy}>
        <Save className="size-4" />
        Save details
      </Button>
    </section>
  );
}
