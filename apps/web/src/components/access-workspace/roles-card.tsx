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
      <ul className="sm:hidden">
        {roles.map((role) => (
          <li key={role.id} className="border-b border-border py-4 last:border-b-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-strong block truncate font-semibold">{role.name}</span>
                {role.code ? (
                  <span className="block truncate font-mono text-[0.6875rem] text-muted-foreground">
                    {role.code}
                  </span>
                ) : null}
              </div>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[0.6875rem] font-bold ${
                  role.isSystem ? "bg-muted text-muted-foreground" : "bg-primary/10 text-primary"
                }`}
              >
                {role.isSystem ? "System" : "Custom"}
              </span>
            </div>
            {role.description ? (
              <p className="mt-2 text-xs text-muted-foreground">{role.description}</p>
            ) : null}
            <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2.5 rounded-[11px] bg-[var(--surface-subtle)] px-3 py-2.5 text-[0.6875rem]">
              <div>
                <dt className="text-muted-foreground">Permissions</dt>
                <dd className="text-strong mt-0.5 font-numeric font-semibold">
                  {role.permissionCount}
                </dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Users</dt>
                <dd className="text-strong mt-0.5 font-numeric font-semibold">{role.userCount}</dd>
              </div>
            </dl>
            {!role.isSystem ? (
              <Button
                variant="ghost"
                size="sm"
                disabled={busy || role.userCount > 0}
                title={
                  role.userCount > 0 ? "Move its people to another role first" : "Archive this role"
                }
                className="mt-2 h-8 rounded-[9px] px-0 text-destructive hover:text-destructive"
                onClick={() => onArchive(role)}
              >
                <Trash2 aria-hidden="true" />
                Archive
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      <div className="hidden overflow-x-auto sm:block">
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
