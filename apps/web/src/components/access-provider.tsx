"use client";

import type { Permission } from "@UnifiedAttendance/api/rbac/permissions";

import { createContext, useContext } from "react";

import { can, type Access } from "@/lib/access";

const AccessContext = createContext<Access | null>(null);

export function AccessProvider({
  access,
  children,
}: {
  access: Access;
  children: React.ReactNode;
}) {
  // The server resolved this before first paint, so gated UI never flickers.
  return <AccessContext.Provider value={access}>{children}</AccessContext.Provider>;
}

export function useAccess() {
  const access = useContext(AccessContext);
  if (!access) {
    throw new Error("useAccess must be used inside an AccessProvider");
  }

  return {
    role: access.role,
    permissions: access.permissions,
    can: (permission: Permission) => can(access, permission),
  };
}
