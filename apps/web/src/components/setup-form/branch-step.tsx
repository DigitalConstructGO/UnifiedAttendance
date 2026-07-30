import { Input } from "@/components/ui/input";
import type { SetupValues } from "./setup-model";

export function BranchStep({
  value,
  onChange,
}: {
  value: SetupValues["branch"];
  onChange: (field: "name" | "code" | "address", value: string) => void;
}) {
  return (
    <section className="mt-2" aria-labelledby="branch-heading">
      <h1
        id="branch-heading"
        className="text-strong font-heading text-2xl font-bold tracking-[-0.025em]"
      >
        First branch
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Add the first physical location where attendance and devices will operate.
      </p>
      <div className="mt-7 grid gap-5 sm:grid-cols-[minmax(0,1.5fr)_minmax(9rem,0.7fr)]">
        <label className="text-strong space-y-2 text-xs font-bold">
          Branch name
          <Input
            autoFocus
            required
            value={value.name}
            onChange={(event) => onChange("name", event.target.value)}
            placeholder="e.g. Main office"
            className="h-11 rounded-[11px] bg-card"
          />
        </label>
        <label className="text-strong space-y-2 text-xs font-bold">
          Branch code
          <Input
            required
            pattern="[A-Za-z0-9-]{2,20}"
            value={value.code}
            onChange={(event) => onChange("code", event.target.value)}
            placeholder="HQ"
            className="h-11 rounded-[11px] bg-card"
          />
        </label>
        <label className="text-strong space-y-2 text-xs font-bold sm:col-span-2">
          Address
          <Input
            required
            value={value.address}
            onChange={(event) => onChange("address", event.target.value)}
            placeholder="Street, city, country"
            className="h-11 rounded-[11px] bg-card"
          />
        </label>
      </div>
    </section>
  );
}
