"use client";

import { UsersRound } from "lucide-react";

import type { RoleSummary, UserAccount } from "@/lib/api";

import { compactSelectClass } from "./styles";

const headerClass =
  "px-3 py-2.5 text-left text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-muted-foreground";

export function UsersCard({
  users,
  roles,
  currentUserId,
  busy,
  onRoleChange,
}: {
  users: UserAccount[];
  roles: RoleSummary[];
  currentUserId: string;
  busy: boolean;
  onRoleChange: (userId: string, roleId: string) => void;
}) {
  return (
    <section className="rounded-[18px] bg-card p-6 shadow-[var(--shadow-card)] ring-1 ring-border">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-[11px] bg-workflow/10 text-workflow">
          <UsersRound className="size-5" />
        </span>
        <div>
          <h2 className="text-strong font-heading font-bold">Who can sign in</h2>
          <p className="text-xs text-muted-foreground">
            Change a role here and the person&apos;s permissions follow it within a minute.
          </p>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[540px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr className="bg-muted/40">
              <th className={headerClass}>Name</th>
              <th className={headerClass}>Email</th>
              <th className={headerClass}>Role</th>
              <th className={headerClass}>Added</th>
            </tr>
          </thead>
          <tbody>
            {users.map((account) => (
              <tr key={account.id} className="border-b border-border">
                <td className="text-strong border-b border-border px-3 py-2.5 font-semibold">
                  {account.name}
                  {account.id === currentUserId ? (
                    <span className="ml-2 rounded-full bg-primary/10 px-2 py-0.5 text-[0.625rem] font-bold text-primary">
                      You
                    </span>
                  ) : null}
                </td>
                <td className="border-b border-border px-3 py-2.5 text-muted-foreground">
                  {account.email}
                </td>
                <td className="border-b border-border px-3 py-2.5">
                  <select
                    value={account.roleId ?? ""}
                    disabled={busy || account.id === currentUserId}
                    onChange={(event) => onRoleChange(account.id, event.target.value)}
                    aria-label={`Role for ${account.name}`}
                    className={compactSelectClass}
                  >
                    {account.roleId ? null : (
                      <option value="" disabled>
                        No role yet
                      </option>
                    )}
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="border-b border-border px-3 py-2.5 text-muted-foreground">
                  {new Date(account.createdAt).toLocaleDateString()}
                </td>
              </tr>
            ))}
            {users.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                  No users yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}
