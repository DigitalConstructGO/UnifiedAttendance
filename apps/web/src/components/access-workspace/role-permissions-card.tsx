"use client";

import { Save, ShieldCheck } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { PermissionRecord, RoleRecord } from "@/lib/api";

import { selectClass } from "./styles";

/** "workforce:manage" → "Workforce · manage" without maintaining a label list. */
function describePermission(code: string) {
  const [domain, action] = code.split(":");
  if (!domain || !action) return code;
  return `${domain[0]?.toUpperCase()}${domain.slice(1)} · ${action}`;
}

export function RolePermissionsCard({
  roles,
  permissionCatalog,
  selectedRole,
  grantedCodes,
  busy,
  onSelectRole,
  onTogglePermission,
  onSave,
}: {
  roles: RoleRecord[];
  permissionCatalog: PermissionRecord[];
  selectedRole: string;
  grantedCodes: string[];
  busy: boolean;
  onSelectRole: (roleId: string) => void;
  onTogglePermission: (code: string) => void;
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

        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {permissionCatalog.map((permission) => (
            <label
              key={permission.id}
              className="flex items-center gap-2.5 rounded-[11px] border border-border px-3 py-2.5 text-xs font-semibold has-checked:border-primary/40 has-checked:bg-primary/5"
            >
              <input
                type="checkbox"
                checked={grantedCodes.includes(permission.code)}
                onChange={() => onTogglePermission(permission.code)}
                className="size-4 accent-primary"
              />
              {describePermission(permission.code)}
            </label>
          ))}
        </div>

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
