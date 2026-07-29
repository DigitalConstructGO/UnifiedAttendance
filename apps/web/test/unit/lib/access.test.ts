import { describe, expect, it } from "vitest";

import { DASHBOARD_NAV, can, toAccess, visibleNavItems } from "@/lib/access";

describe("toAccess", () => {
  it("collapses the one-row-per-permission shape into a single Access", () => {
    expect(
      toAccess([
        { roleName: "HR", permission: "workforce:read" },
        { roleName: "HR", permission: "workforce:manage" },
      ]),
    ).toEqual({ role: "HR", permissions: ["workforce:read", "workforce:manage"] });
  });

  it("reads the Role of a user whose Role grants nothing", () => {
    expect(toAccess([{ roleName: "Manager", permission: null }])).toEqual({
      role: "Manager",
      permissions: [],
    });
  });

  it("reports no Role when the user has no assignment", () => {
    expect(toAccess([])).toEqual({ role: null, permissions: [] });
  });
});

describe("can", () => {
  const hr = toAccess([{ roleName: "HR", permission: "workforce:read" }]);

  it("allows a permission the Role was granted", () => {
    expect(can(hr, "workforce:read")).toBe(true);
  });

  it("denies a permission the Role was not granted", () => {
    expect(can(hr, "workforce:manage")).toBe(false);
  });

  it("denies everything to a user with no Role", () => {
    expect(can(toAccess([]), "workforce:read")).toBe(false);
  });
});

describe("visibleNavItems", () => {
  it("shows only the modules the user can read", () => {
    const access = toAccess([
      { roleName: "Manager", permission: "workforce:read" },
      { roleName: "Manager", permission: "attendance:read" },
    ]);

    expect(visibleNavItems(access).map((item) => item.href)).toEqual([
      "/dashboard/workforce",
      "/dashboard/attendance",
    ]);
  });

  it("shows every module to a Role holding every read permission", () => {
    const access = toAccess(
      DASHBOARD_NAV.map((item) => ({ roleName: "Admin", permission: item.permission })),
    );

    expect(visibleNavItems(access)).toHaveLength(DASHBOARD_NAV.length);
  });

  it("shows nothing to a user with no Role", () => {
    expect(visibleNavItems(toAccess([]))).toEqual([]);
  });
});
