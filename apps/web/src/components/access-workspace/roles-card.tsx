"use client";

import { Shield, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { RoleSummary } from "@/lib/api";

const headerClass =
  "px-3 py-2.5 text-left text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-muted-foreground";
const cellClass = "border-b border-border px-3 py-2.5";

export function RolesCard({
  roles,
  busy,
  onArchive,
}: {
  roles: RoleSummary[];
  busy: boolean;
  onArchive: (role: RoleSummary) => void;
}) {
  return (
    <section className="rounded-[18px] bg-card p-6 shadow-[var(--shadow-card)] ring-1 ring-border">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-[11px] bg-workflow/10 text-workflow">
          <Shield className="size-5" />
        </span>
        <div>
          <h2 className="text-strong font-heading font-bold">Roles</h2>
          <p className="text-xs text-muted-foreground">
            System roles ship with the product and cannot be renamed or archived; custom roles are
            yours to shape.
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="bg-muted/40">
              <th className={headerClass}>Name</th>
              <th className={headerClass}>Description</th>
              <th className={headerClass}>Scope</th>
              <th className={headerClass}>Permissions</th>
              <th className={headerClass}>Users</th>
              <th className={headerClass}>
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {roles.map((role) => (
              <tr key={role.id}>
                <td className={cellClass}>
                  <span className="text-strong block font-semibold">{role.name}</span>
                  {role.code ? (
                    <span className="block font-mono text-[0.6875rem] text-muted-foreground">
                      {role.code}
                    </span>
                  ) : null}
                </td>
                <td className={`${cellClass} text-muted-foreground`}>{role.description ?? "—"}</td>
                <td className={cellClass}>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-bold ${
                      role.isSystem
                        ? "bg-muted text-muted-foreground"
                        : "bg-primary/10 text-primary"
                    }`}
                  >
                    {role.isSystem ? "System" : "Custom"}
                  </span>
                </td>
                <td className={`${cellClass} font-numeric`}>{role.permissionCount}</td>
                <td className={`${cellClass} font-numeric`}>{role.userCount}</td>
                <td className={cellClass}>
                  {!role.isSystem ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={busy || role.userCount > 0}
                      title={
                        role.userCount > 0
                          ? "Move its people to another role first"
                          : "Archive this role"
                      }
                      className="h-8 rounded-[9px] text-destructive hover:text-destructive"
                      onClick={() => onArchive(role)}
                    >
                      <Trash2 aria-hidden="true" />
                      Archive
                    </Button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
