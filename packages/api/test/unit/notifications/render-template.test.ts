import { describe, expect, it } from "vitest";

import { renderTemplate } from "../../../src/modules/notifications/render-template";

describe("renderTemplate", () => {
  it("substitutes every known token", () => {
    const result = renderTemplate(
      "Hi {{employeeName}}, you were {{lateMinutes}} minutes late at {{branchName}} on {{date}} (occurrence #{{occurrenceCount}}).",
      {
        employeeName: "Abel Tesfaye",
        lateMinutes: 12,
        branchName: "Head Office",
        date: "2026-03-04",
        occurrenceCount: 3,
      },
    );

    expect(result).toBe(
      "Hi Abel Tesfaye, you were 12 minutes late at Head Office on 2026-03-04 (occurrence #3).",
    );
  });

  it("substitutes the same token more than once", () => {
    expect(renderTemplate("{{date}} is {{date}}", { date: "2026-03-04" })).toBe(
      "2026-03-04 is 2026-03-04",
    );
  });

  it("leaves an unmatched token untouched", () => {
    expect(renderTemplate("Hi {{employeeName}}, {{unknownToken}}", { employeeName: "Abel" })).toBe(
      "Hi Abel, {{unknownToken}}",
    );
  });

  it("leaves a template with no tokens unchanged", () => {
    expect(renderTemplate("No tokens here", {})).toBe("No tokens here");
  });

  it("stringifies numeric values", () => {
    expect(renderTemplate("{{lateMinutes}} minutes", { lateMinutes: 0 })).toBe("0 minutes");
  });
});
