import { describe, expect, it } from "vitest";

import { hasPermission, isFixedRole, PERMISSIONS } from "../../../src/rbac/permissions";

describe("hasPermission", () => {
  it("allows an action when the user's Role grants its seeded permission", () => {
    expect(hasPermission([PERMISSIONS.workforceRead], PERMISSIONS.workforceRead)).toBe(true);
  });

  it("denies an action when the user's Role does not grant its seeded permission", () => {
    expect(hasPermission([PERMISSIONS.workforceRead], PERMISSIONS.workforceManage)).toBe(false);
  });
});

describe("isFixedRole", () => {
  it("accepts only the application-defined roles", () => {
    expect(isFixedRole("Super Administrator")).toBe(true);
    expect(isFixedRole("HR")).toBe(true);
    expect(isFixedRole("Custom payroll role")).toBe(false);
  });
});
