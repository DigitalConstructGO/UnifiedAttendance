import { describe, expect, it } from "vitest";

import { insertPlaceholder, placeholdersFor } from "@/components/notification-tiers/tier-model";

describe("placeholdersFor", () => {
  it("offers every value the late-arrival scan supplies, with a human label", () => {
    expect(placeholdersFor("late")).toEqual([
      { token: "{{employeeName}}", label: "Employee name" },
      { token: "{{date}}", label: "Date" },
      { token: "{{branchName}}", label: "Branch" },
      { token: "{{lateMinutes}}", label: "Minutes late" },
      { token: "{{occurrenceCount}}", label: "Times this week" },
    ]);
  });

  it("omits minutes late for absences, which have no arrival to measure", () => {
    expect(placeholdersFor("absent").map((p) => p.token)).toEqual([
      "{{employeeName}}",
      "{{date}}",
      "{{branchName}}",
      "{{occurrenceCount}}",
    ]);
  });
});

describe("insertPlaceholder", () => {
  it("inserts at the cursor and places the cursor after the token", () => {
    expect(insertPlaceholder("Hi , welcome", { start: 3, end: 3 }, "{{employeeName}}")).toEqual({
      text: "Hi {{employeeName}}, welcome",
      cursor: 19,
    });
  });

  it("replaces a selection", () => {
    expect(insertPlaceholder("Hi NAME, welcome", { start: 3, end: 7 }, "{{employeeName}}")).toEqual(
      {
        text: "Hi {{employeeName}}, welcome",
        cursor: 19,
      },
    );
  });

  it("appends when there is no cursor position", () => {
    expect(insertPlaceholder("Hi ", null, "{{employeeName}}")).toEqual({
      text: "Hi {{employeeName}}",
      cursor: 19,
    });
  });
});
