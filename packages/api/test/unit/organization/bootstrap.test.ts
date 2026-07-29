import { describe, expect, it } from "vitest";

import { bootstrapOrganizationInput } from "../../../src/validations/organization";

const validDays = Array.from({ length: 7 }, (_, weekday) => ({
  weekday,
  isWorkingDay: weekday < 5,
  openingTime: weekday < 5 ? "08:00" : null,
  closingTime: weekday < 5 ? "17:00" : null,
}));

describe("organization bootstrap input", () => {
  it("normalizes valid organization and branch codes", () => {
    const result = bootstrapOrganizationInput.parse({
      organization: { name: "Acme", code: " ac-1 " },
      branch: { name: "Main", code: "hq-1", address: "Addis Ababa" },
      days: validDays,
    });

    expect(result.organization.code).toBe("AC-1");
    expect(result.branch.code).toBe("HQ-1");
  });

  it("rejects a working day without a complete time window", () => {
    const result = bootstrapOrganizationInput.safeParse({
      organization: { name: "Acme", code: "ACME" },
      branch: { name: "Main", code: "HQ", address: "Addis Ababa" },
      days: validDays.map((day, index) => index === 0 ? { ...day, closingTime: null } : day),
    });

    expect(result.success).toBe(false);
  });
});
