import { describe, expect, it } from "vitest";

import { resolveNotificationRecipients } from "../../../src/modules/notifications/recipients";

describe("resolveNotificationRecipients", () => {
  it("includes every HR email plus the employee's own email", () => {
    const recipients = resolveNotificationRecipients(
      ["hr1@example.test", "hr2@example.test"],
      "employee@example.test",
    );

    expect([...recipients].sort()).toEqual(
      ["employee@example.test", "hr1@example.test", "hr2@example.test"].sort(),
    );
  });

  it("omits the employee when they have no email on file", () => {
    const recipients = resolveNotificationRecipients(["hr1@example.test"], null);

    expect([...recipients]).toEqual(["hr1@example.test"]);
  });

  it("de-duplicates when the employee's email is also an HR email", () => {
    const recipients = resolveNotificationRecipients(
      ["hr1@example.test", "shared@example.test"],
      "shared@example.test",
    );

    expect([...recipients].sort()).toEqual(["hr1@example.test", "shared@example.test"].sort());
  });

  it("returns an empty set when there is no HR email and no employee email", () => {
    const recipients = resolveNotificationRecipients([], null);

    expect(recipients.size).toBe(0);
  });
});
