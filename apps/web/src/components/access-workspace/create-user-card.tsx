"use client";

import { UserRoundPlus } from "lucide-react";
import type React from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { RoleRecord } from "@/lib/api";

import { selectClass } from "./styles";

export function CreateUserCard({
  roles,
  busy,
  onSubmit,
}: {
  roles: RoleRecord[];
  busy: boolean;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <section className="rounded-[18px] bg-card p-6 shadow-[var(--shadow-card)] ring-1 ring-border">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-[11px] bg-workflow/10 text-workflow">
          <UserRoundPlus className="size-5" />
        </span>
        <div>
          <h2 className="text-strong font-heading font-bold">Create a user</h2>
          <p className="text-xs text-muted-foreground">
            The account can sign in straight away with the password you set here — share it with
            them privately and have them change it.
          </p>
        </div>
      </div>
      <form className="grid gap-4 sm:grid-cols-2" onSubmit={onSubmit}>
        <label className="text-strong space-y-2 text-xs font-bold">
          Full name
          <Input required name="name" autoComplete="off" />
        </label>
        <label className="text-strong space-y-2 text-xs font-bold">
          Email
          <Input required type="email" name="email" autoComplete="off" />
        </label>
        <label className="text-strong space-y-2 text-xs font-bold">
          Password
          <Input
            required
            type="password"
            name="password"
            minLength={8}
            autoComplete="new-password"
            placeholder="At least 8 characters"
          />
        </label>
        <label className="text-strong space-y-2 text-xs font-bold">
          Role
          <select required name="roleId" defaultValue="" className={selectClass}>
            <option value="" disabled>
              Choose a role
            </option>
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <div className="sm:col-span-2">
          <Button disabled={busy} className="h-10 rounded-[11px] px-5 font-bold">
            {busy ? "Creating user…" : "Create user"}
          </Button>
        </div>
      </form>
    </section>
  );
}
