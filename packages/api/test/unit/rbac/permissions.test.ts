import { describe, expect, it } from "vitest";

import {
  hasPermission,
  isRole,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  ROLES,
} from "../../../src/rbac/permissions";

describe("hasPermission", () => {
  it("allows an action when the user's Role grants its seeded permission", () => {
    expect(hasPermission(["workforce:read"], "workforce:read")).toBe(true);
  });

  it("denies an action when the user's Role does not grant its seeded permission", () => {
    expect(hasPermission(["workforce:read"], "workforce:manage")).toBe(false);
  });
});

describe("isRole", () => {
  it("accepts only the application-defined roles", () => {
    expect(isRole("Super Administrator")).toBe(true);
    expect(isRole("HR")).toBe(true);
    expect(isRole("Custom payroll role")).toBe(false);
  });
});

describe("Client CRM access", () => {
  it.each([ROLES.superAdministrator, ROLES.admin])(
    "grants %s permission to view Client and lead details",
    (role) => {
      expect(ROLE_PERMISSIONS[role]).toContain(PERMISSIONS.clientsRead);
    },
  );
  it("restricts HR from accessing Client and lead details", () => {
    expect(ROLE_PERMISSIONS[ROLES.hr]).not.toContain(PERMISSIONS.clientsRead);
  });
});
