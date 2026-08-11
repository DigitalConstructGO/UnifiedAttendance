"use client";

import { ShieldPlus } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { PermissionChecklist, PERMISSION_MODULES } from "./permission-checklist";

const ALL_CODES = PERMISSION_MODULES.flatMap(({ codes }) => codes);

function suggestCode(name: string) {
  return name
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export function CreateRoleCard({
  busy,
  onSubmit,
}: {
  busy: boolean;
  onSubmit: (input: {
    name: string;
    code: string;
    description: string | null;
    permissionCodes: string[];
  }) => void;
}) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [codeTouched, setCodeTouched] = useState(false);
  const [description, setDescription] = useState("");
  const [selected, setSelected] = useState<string[]>([]);

  return (
    <section className="rounded-[18px] bg-card p-6 shadow-[var(--shadow-card)] ring-1 ring-border">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-[11px] bg-workflow/10 text-workflow">
          <ShieldPlus className="size-5" />
        </span>
        <div>
          <h2 className="text-strong font-heading font-bold">New role</h2>
          <p className="text-xs text-muted-foreground">
            Name the role and tick exactly what it may do.
          </p>
        </div>
      </div>

      <form
        className="grid gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit({
            name: name.trim(),
            code: code.trim(),
            description: description.trim() || null,
            permissionCodes: selected,
          });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-strong space-y-2 text-xs font-bold">
            Name
            <Input
              required
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                if (!codeTouched) setCode(suggestCode(event.target.value));
              }}
              placeholder="Content Manager"
            />
          </label>
          <label className="text-strong space-y-2 text-xs font-bold">
            Code
            <Input
              required
              value={code}
              pattern="[A-Z0-9_]{2,40}"
              onChange={(event) => {
                setCodeTouched(true);
                setCode(event.target.value.toUpperCase());
              }}
              placeholder="CONTENT_MANAGER"
              className="font-mono"
            />
          </label>
        </div>
        <label className="text-strong space-y-2 text-xs font-bold">
          Description (optional)
          <Input
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            placeholder="What this role is for"
          />
        </label>

        <div className="flex items-center justify-between">
          <p className="text-xs font-semibold text-muted-foreground">
            {selected.length} permission{selected.length === 1 ? "" : "s"} selected
          </p>
          <div className="flex gap-3 text-xs font-bold">
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => setSelected(ALL_CODES)}
            >
              Select all
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:underline"
              onClick={() => setSelected([])}
            >
              Clear all
            </button>
          </div>
        </div>

        <PermissionChecklist
          selected={selected}
          onToggle={(toggled) =>
            setSelected((current) =>
              current.includes(toggled)
                ? current.filter((code) => code !== toggled)
                : [...current, toggled],
            )
          }
          onSetModule={(codes, granted) =>
            setSelected((current) =>
              granted
                ? [...current, ...codes.filter((code) => !current.includes(code))]
                : current.filter((code) => !codes.includes(code)),
            )
          }
        />

        <div>
          <Button
            disabled={busy || selected.length === 0}
            className="h-10 rounded-[11px] px-5 font-bold"
          >
            {busy ? "Creating role…" : "Create role"}
          </Button>
        </div>
      </form>
    </section>
  );
}
