import { describe, expect, it } from "vitest";

import { DASHBOARD_NAV, can, toAccess, visibleNavItems, visibleNavSections } from "@/lib/access";

describe("toAccess", () => {
  it("collapses the one-row-per-permission shape into a single Access", () => {
    expect(
      toAccess([
        { roleName: "HR", permission: "employees.read" },
        { roleName: "HR", permission: "employees.create" },
      ]),
    ).toEqual({ role: "HR", permissions: ["employees.read", "employees.create"] });
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
  const hr = toAccess([{ roleName: "HR", permission: "employees.read" }]);

  it("allows a permission the Role was granted", () => {
    expect(can(hr, "employees.read")).toBe(true);
  });

  it("denies a permission the Role was not granted", () => {
    expect(can(hr, "employees.create")).toBe(false);
  });

  it("denies everything to a user with no Role", () => {
    expect(can(toAccess([]), "employees.read")).toBe(false);
  });
});

describe("visibleNavItems", () => {
  it("shows only the modules the user can read", () => {
    const access = toAccess([
      { roleName: "Manager", permission: "employees.read" },
      { roleName: "Manager", permission: "attendance.read" },
    ]);

    expect(visibleNavItems(access).map((item) => item.href)).toEqual([
      "/dashboard/attendance",
      "/dashboard/employees",
    ]);
  });

  it("groups visible modules without rendering empty sections", () => {
    const access = toAccess([
      { roleName: "HR", permission: "attendance.read" },
      { roleName: "HR", permission: "clients.read" },
    ]);

    expect(visibleNavSections(access).map((section) => section.label)).toEqual([
      "Office",
      "Clients",
    ]);
  });

  it("shows every module to the Super Administrator", () => {
    const access = toAccess(
      DASHBOARD_NAV.map((item) => ({
        roleName: "Super Administrator",
        permission: item.permission,
      })),
    );

    expect(visibleNavItems(access)).toHaveLength(DASHBOARD_NAV.length);
  });

  it("keeps Users & access from everyone but the Super Administrator", () => {
    const access = toAccess(
      DASHBOARD_NAV.map((item) => ({ roleName: "Admin", permission: item.permission })),
    );

    expect(visibleNavItems(access).map((item) => item.label)).not.toContain("Users & access");
  });

  it("shows nothing to a user with no Role", () => {
    expect(visibleNavItems(toAccess([]))).toEqual([]);
  });
});

describe("nav sections", () => {
  const superAdmin = toAccess(
    DASHBOARD_NAV.map((item) => ({
      roleName: "Super Administrator",
      permission: item.permission,
    })),
  );

  it("places every visible module in a section", () => {
    // visibleNavSections builds the sidebar from NAV_SECTIONS, so a module
    // missing from that list is silently dropped: the route works and the link
    // never appears. Revenue shipped that way once.
    const sectioned = visibleNavSections(superAdmin).flatMap((section) =>
      section.items.map((item) => item.label),
    );

    expect(sectioned.toSorted()).toEqual(
      visibleNavItems(superAdmin)
        .map((i) => i.label)
        .toSorted(),
    );
  });

  it("lists Revenue under Clients", () => {
    const clients = visibleNavSections(superAdmin).find((section) => section.label === "Clients");

    expect(clients?.items.map((item) => item.label)).toContain("Revenue");
  });
});
