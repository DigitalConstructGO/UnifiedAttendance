"use client";

import { Check, LoaderCircle } from "lucide-react";

import { RequestErrorAlert } from "@/components/request-error-alert";
import { authClient } from "@/lib/auth-client";

import { CreateUserCard } from "./create-user-card";
import { RolePermissionsCard } from "./role-permissions-card";
import { UsersCard } from "./users-card";
import { useAccessWorkspace } from "./use-access-workspace";

export function AccessWorkspace() {
  const workspace = useAccessWorkspace();
  const { data: session } = authClient.useSession();

  if (!workspace.loaded) {
    return (
      <div className="mx-auto flex min-h-64 w-full max-w-5xl items-center justify-center">
        {workspace.error ? (
          <RequestErrorAlert error={workspace.error} onRetry={workspace.retry} focusOnError />
        ) : (
          <LoaderCircle className="animate-spin text-primary" aria-label="Loading users" />
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6">
      <header>
        <p className="text-xs font-semibold text-muted-foreground">Workspace administration</p>
        <h1 className="text-strong mt-1 font-heading text-2xl font-bold tracking-[-0.03em]">
          Users &amp; access
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Create the people who run this workspace, give each one a role, and decide what every role
          may do.
        </p>
      </header>

      {workspace.notice ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-[11px] bg-success/8 px-4 py-3 text-sm text-success ring-1 ring-success/20"
        >
          <Check className="size-4" />
          {workspace.notice}
        </div>
      ) : null}
      {workspace.error ? (
        <RequestErrorAlert error={workspace.error} onRetry={workspace.retry} />
      ) : null}

      <CreateUserCard
        roles={workspace.roles}
        busy={workspace.creatingUser}
        onSubmit={workspace.createUser}
      />

      <UsersCard
        users={workspace.users}
        roles={workspace.roles}
        currentUserId={session?.user.id ?? ""}
        busy={workspace.busy}
        onRoleChange={workspace.changeUserRole}
      />

      <RolePermissionsCard
        roles={workspace.editableRoles}
        permissionCatalog={workspace.permissionCatalog}
        selectedRole={workspace.selectedRole}
        grantedCodes={workspace.grantedCodes}
        busy={workspace.busy}
        onSelectRole={workspace.selectRole}
        onTogglePermission={workspace.togglePermission}
        onSave={workspace.savePermissions}
      />
    </div>
  );
}
