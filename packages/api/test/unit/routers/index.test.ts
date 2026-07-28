import { describe, expect, it } from "vitest";

import { createInnerContext } from "../../../src/context";
import { appRouter } from "../../../src/routers/index";

describe("appRouter.healthCheck", () => {
  it("returns OK", async () => {
    const caller = appRouter.createCaller(createInnerContext({ session: null }));
    const result = await caller.healthCheck();

    expect(result).toBe("OK");
  });

  it("rejects protected procedures without a session", async () => {
    const caller = appRouter.createCaller(createInnerContext({ session: null }));

    await expect(caller.access.me()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
