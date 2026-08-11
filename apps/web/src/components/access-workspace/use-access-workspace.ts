"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import type React from "react";

import { accessApi, accessKeys, accessQueries } from "@/lib/api";
import { presentRequestError } from "@/lib/errors";
import { firstQueryFailure } from "@/lib/query-errors";

export function useAccessWorkspace() {
  const queryClient = useQueryClient();
  const [notice, setNotice] = useState<string | null>(null);
  const [chosenRole, setChosenRole] = useState("");
  const [permissionsDraft, setPermissionsDraft] = useState<{
    roleId: string;
    codes: string[];
  } | null>(null);

  const usersQuery = useQuery(accessQueries.users());
  const rolesQuery = useQuery(accessQueries.roles());
  const permissionsQuery = useQuery(accessQueries.permissions());
  const roleGrantsQuery = useQuery(accessQueries.roleGrants());

  const users = usersQuery.data ?? [];
  const roles = rolesQuery.data ?? [];
  const permissionCatalog = permissionsQuery.data ?? [];
  const roleGrants = roleGrantsQuery.data ?? [];

  // The Super Administrator role is the one that edits the others; letting it
  // trim its own grants is how an organization locks itself out.
  const editableRoles = roles.filter((role) => role.name !== "Super Administrator");
  const selectedRole = chosenRole || editableRoles[0]?.id || "";
  const grantedCodes =
    permissionsDraft?.roleId === selectedRole
      ? permissionsDraft.codes
      : roleGrants.filter((grant) => grant.roleId === selectedRole).map((g) => g.permissionCode);

  const createUser = useMutation({
    mutationFn: accessApi.createUser,
    onSuccess: async (created) => {
      setNotice(`${created.name} can now sign in as ${created.roleName}.`);
      await queryClient.invalidateQueries({ queryKey: accessKeys.users });
    },
  });

  const assignRole = useMutation({
    mutationFn: accessApi.assignRole,
    onSuccess: async () => {
      setNotice("Role updated. Signed-in users pick it up within a minute.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accessKeys.users }),
        queryClient.invalidateQueries({ queryKey: accessKeys.assignments }),
      ]);
    },
  });

  const savePermissions = useMutation({
    mutationFn: accessApi.updateRolePermissions,
    onSuccess: async (role) => {
      setPermissionsDraft(null);
      setNotice(`Permissions saved for ${role.name}. They apply within a minute.`);
      await queryClient.invalidateQueries({ queryKey: accessKeys.roleGrants });
    },
  });

  const writes = [
    [createUser, "Could not create the user."],
    [assignRole, "Could not change the role."],
    [savePermissions, "Could not save the permissions."],
  ] as const;

  const failedWrite = writes.find(([mutation]) => mutation.error !== null);
  const loadFailure = firstQueryFailure([
    [usersQuery, "Could not load users."],
    [rolesQuery, "Could not load roles."],
    [permissionsQuery, "Could not load the permission catalog."],
    [roleGrantsQuery, "Could not load role permissions."],
  ]);
  const error = failedWrite
    ? presentRequestError(failedWrite[0].error, failedWrite[1])
    : (loadFailure?.error ?? null);

  /** One action, one banner: drop the previous result before starting the next write. */
  function clearFeedback() {
    setNotice(null);
    for (const [mutation] of writes) mutation.reset();
  }

  return {
    users,
    roles,
    editableRoles,
    permissionCatalog,
    selectedRole,
    grantedCodes,
    notice,
    error,
    loaded: usersQuery.isSuccess && rolesQuery.isSuccess,
    busy: writes.some(([mutation]) => mutation.isPending),
    creatingUser: createUser.isPending,
    retry: loadFailure?.retry,
    selectRole: (roleId: string) => {
      setChosenRole(roleId);
      setPermissionsDraft(null);
      clearFeedback();
    },
    togglePermission: (code: string) => {
      const codes = grantedCodes.includes(code)
        ? grantedCodes.filter((granted) => granted !== code)
        : [...grantedCodes, code];
      setPermissionsDraft({ roleId: selectedRole, codes });
    },
    createUser: (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const target = event.currentTarget;
      const form = new FormData(target);
      clearFeedback();
      createUser.mutate(
        {
          name: String(form.get("name")),
          email: String(form.get("email")),
          password: String(form.get("password")),
          roleId: String(form.get("roleId")),
        },
        { onSuccess: () => target.reset() },
      );
    },
    changeUserRole: (userId: string, roleId: string) => {
      clearFeedback();
      assignRole.mutate({ userId, roleId });
    },
    savePermissions: () => {
      if (!selectedRole) return;
      clearFeedback();
      savePermissions.mutate({ roleId: selectedRole, permissionCodes: grantedCodes });
    },
  };
}
