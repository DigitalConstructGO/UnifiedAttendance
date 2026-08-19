import { describe, expect, it } from "vitest";

import { resolveNotificationTier } from "../../../src/modules/notifications/resolve-tier";

describe("resolveNotificationTier", () => {
  const tiers = [
    { id: "t1", threshold: 1 },
    { id: "t2", threshold: 3 },
    { id: "t3", threshold: 5 },
  ];

  it("picks the highest threshold at or below the occurrence count", () => {
    expect(resolveNotificationTier(tiers, 4)).toMatchObject({ id: "t2" });
  });

  it("picks the exact match when the count equals a threshold", () => {
    expect(resolveNotificationTier(tiers, 3)).toMatchObject({ id: "t2" });
  });

  it("picks the highest tier once the count exceeds every threshold", () => {
    expect(resolveNotificationTier(tiers, 100)).toMatchObject({ id: "t3" });
  });

  it("returns null when the count is below every threshold", () => {
    expect(resolveNotificationTier(tiers, 0)).toBeNull();
  });

  it("returns null for an empty tier list", () => {
    expect(resolveNotificationTier([], 5)).toBeNull();
  });

  it("does not depend on input order", () => {
    const shuffled = [tiers[2]!, tiers[0]!, tiers[1]!];
    expect(resolveNotificationTier(shuffled, 4)).toMatchObject({ id: "t2" });
  });
});
