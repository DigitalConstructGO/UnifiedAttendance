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
  const roleGrantsQuery = useQuery(accessQueries.roleGrants());

  const users = usersQuery.data ?? [];
  const roles = rolesQuery.data ?? [];
  const roleGrants = roleGrantsQuery.data ?? [];

  const editableRoles = roles.filter((role) => role.name !== "Super Administrator");
  const selectedRole = chosenRole || editableRoles[0]?.id || "";
  const grantedCodes =
    permissionsDraft?.roleId === selectedRole
      ? permissionsDraft.codes
      : roleGrants.filter((grant) => grant.roleId === selectedRole).map((g) => g.permissionCode);

  async function refreshRoles() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: accessKeys.roles }),
      queryClient.invalidateQueries({ queryKey: accessKeys.roleGrants }),
    ]);
  }

  const createUser = useMutation({
    mutationFn: accessApi.createUser,
    onSuccess: async (created) => {
      setNotice(`${created.name} can now sign in as ${created.roleName}.`);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accessKeys.users }),
        queryClient.invalidateQueries({ queryKey: accessKeys.roles }),
      ]);
    },
  });

  const assignRole = useMutation({
    mutationFn: accessApi.assignRole,
    onSuccess: async () => {
      setNotice("Role updated. Signed-in users pick it up within a minute.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: accessKeys.users }),
        queryClient.invalidateQueries({ queryKey: accessKeys.roles }),
        queryClient.invalidateQueries({ queryKey: accessKeys.assignments }),
      ]);
    },
  });

  const savePermissions = useMutation({
    mutationFn: accessApi.updateRolePermissions,
    onSuccess: async (role) => {
      setPermissionsDraft(null);
      setNotice(`Permissions saved for ${role.name}. They apply within a minute.`);
      await refreshRoles();
    },
  });

  const createRole = useMutation({
    mutationFn: accessApi.createRole,
    onSuccess: async (role) => {
      setNotice(`Role ${role.name} created — assign it from the users table.`);
      await refreshRoles();
    },
  });

  const archiveRole = useMutation({
    mutationFn: accessApi.archiveRole,
    onSuccess: async (_role, archivedRoleId) => {
      setNotice("Role archived.");
      if (archivedRoleId === selectedRole) {
        setChosenRole("");
        setPermissionsDraft(null);
      }
      await refreshRoles();
    },
  });

  const writes = [
    [createUser, "Could not create the user."],
    [assignRole, "Could not change the role."],
    [savePermissions, "Could not save the permissions."],
    [createRole, "Could not create the role."],
    [archiveRole, "Could not archive the role."],
  ] as const;

  const failedWrite = writes.find(([mutation]) => mutation.error !== null);
  const loadFailure = firstQueryFailure([
    [usersQuery, "Could not load users."],
    [rolesQuery, "Could not load roles."],
    [roleGrantsQuery, "Could not load role permissions."],
  ]);
  const error = failedWrite
    ? presentRequestError(failedWrite[0].error, failedWrite[1])
    : (loadFailure?.error ?? null);

  function clearFeedback() {
    setNotice(null);
    for (const [mutation] of writes) mutation.reset();
  }

  return {
    users,
    roles,
    editableRoles,
    selectedRole,
    grantedCodes,
    notice,
    error,
    loaded: usersQuery.isSuccess && rolesQuery.isSuccess,
    busy: writes.some(([mutation]) => mutation.isPending),
    creatingUser: createUser.isPending,
    creatingRole: createRole.isPending,
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
    setModulePermissions: (moduleCodes: string[], granted: boolean) => {
      const codes = granted
        ? [...grantedCodes, ...moduleCodes.filter((code) => !grantedCodes.includes(code))]
        : grantedCodes.filter((code) => !moduleCodes.includes(code));
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
    createRole: (input: {
      name: string;
      code: string;
      description: string | null;
      permissionCodes: string[];
    }) => {
      clearFeedback();
      createRole.mutate(input);
    },
    archiveRole: (roleId: string) => {
      clearFeedback();
      archiveRole.mutate(roleId);
    },
  };
}
