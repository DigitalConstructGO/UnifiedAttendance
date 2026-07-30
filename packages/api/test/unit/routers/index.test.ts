import { describe, expect, it } from "vitest";

import { appRouter } from "../../../src/routers/index";

describe("appRouter.healthCheck", () => {
  it("returns OK", async () => {
    const caller = appRouter.createCaller({ session: null });
    const result = await caller.healthCheck();

    expect(result).toBe("OK");
  });
});
