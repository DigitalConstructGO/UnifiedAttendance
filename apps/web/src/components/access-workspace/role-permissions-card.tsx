"use client";

import { Save, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { RoleSummary } from "@/lib/api";

import { PermissionChecklist } from "./permission-checklist";
import { selectClass } from "./styles";

export function RolePermissionsCard({
  roles,
  selectedRole,
  grantedCodes,
  busy,
  onSelectRole,
  onTogglePermission,
  onSetModule,
  onSave,
}: {
  roles: RoleSummary[];
  selectedRole: string;
  grantedCodes: string[];
  busy: boolean;
  onSelectRole: (roleId: string) => void;
  onTogglePermission: (code: string) => void;
  onSetModule: (codes: string[], granted: boolean) => void;
  onSave: () => void;
}) {
  return (
    <section className="rounded-[18px] bg-card p-6 shadow-[var(--shadow-card)] ring-1 ring-border">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-[11px] bg-workflow/10 text-workflow">
          <ShieldCheck className="size-5" />
        </span>
        <div>
          <h2 className="text-strong font-heading font-bold">What each role may do</h2>
          <p className="text-xs text-muted-foreground">
            Tick the permissions a role grants. Super Administrator always holds everything and is
            not editable here.
          </p>
        </div>
      </div>

      <div className="grid gap-4">
        <label className="text-strong max-w-xs space-y-2 text-xs font-bold">
          Role
          <select
            value={selectedRole}
            onChange={(event) => onSelectRole(event.target.value)}
            className={selectClass}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>

        <PermissionChecklist
          selected={grantedCodes}
          onToggle={onTogglePermission}
          onSetModule={onSetModule}
        />

        <div>
          <Button
            disabled={busy || !selectedRole}
            onClick={onSave}
            className="h-10 rounded-[11px] px-5 font-bold"
          >
            <Save aria-hidden="true" />
            {busy ? "Saving…" : "Save permissions"}
          </Button>
        </div>
      </div>
    </section>
  );
}
