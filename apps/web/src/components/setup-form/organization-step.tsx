import { Input } from "@/components/ui/input";
import type { SetupValues } from "./types";

export function OrganizationStep({
  value,
  onChange,
}: {
  value: SetupValues["organization"];
  onChange: (field: "name" | "code", value: string) => void;
}) {
  return (
    <section className="mt-2" aria-labelledby="organization-heading">
      <h1
        id="organization-heading"
        className="text-strong font-heading text-2xl font-bold tracking-[-0.025em]"
      >
        Organization
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Tell us about the organization. You can change these details later in settings.
      </p>
      <div className="mt-7 grid gap-5">
        <label className="text-strong space-y-2 text-xs font-bold">
          Organization name
          <Input
            autoFocus
            required
            value={value.name}
            onChange={(event) => onChange("name", event.target.value)}
            placeholder="e.g. Acme Services"
            className="h-11 rounded-[11px] bg-card"
          />
        </label>
        <label className="text-strong space-y-2 text-xs font-bold">
          Organization code
          <span className="ml-2 font-normal text-muted-foreground">
            2–20 letters, numbers, or hyphens
          </span>
          <Input
            required
            pattern="[A-Za-z0-9-]{2,20}"
            value={value.code}
            onChange={(event) => onChange("code", event.target.value)}
            placeholder="ACME"
            className="h-11 rounded-[11px] bg-card"
          />
        </label>
      </div>
    </section>
  );
}
