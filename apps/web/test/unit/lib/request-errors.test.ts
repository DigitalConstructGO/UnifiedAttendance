import { afterEach, describe, expect, it, vi } from "vitest";

import { ApiRequestError, apiFetch } from "@/lib/api/client";
import { presentRequestError } from "@/lib/errors";

type ResponseOptions = {
  ok: boolean;
  status: number;
  requestId?: string;
};

function response(body: string, options: ResponseOptions) {
  return {
    ...options,
    headers: {
      get: (name: string) => (name === "x-request-id" ? (options.requestId ?? null) : null),
    },
    statusText: "",
    text: async () => body,
  } as Response;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("apiFetch", () => {
  it("preserves the normalized API envelope and request reference", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        response(
          JSON.stringify({
            error: {
              code: "UNPROCESSABLE_CONTENT",
              message: "Invalid input",
              requestId: "request-123",
              details: { properties: { name: { errors: ["Name is required"] } } },
            },
          }),
          { ok: false, status: 422 },
        ),
      ),
    );

    await expect(apiFetch("/example")).rejects.toMatchObject({
      code: "UNPROCESSABLE_CONTENT",
      status: 422,
      kind: "http",
      retryable: false,
      requestId: "request-123",
    });
  });

  it("normalizes network failures as retryable", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(apiFetch("/example")).rejects.toMatchObject({
      code: "NETWORK_ERROR",
      status: 0,
      kind: "network",
      retryable: true,
    });
  });

  it("does not leak a JSON parser error when a response is malformed", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(response("not-json", { ok: true, status: 200 })),
    );

    await expect(apiFetch("/example")).rejects.toMatchObject({
      code: "INVALID_RESPONSE",
      kind: "invalid_response",
      retryable: false,
    });
  });
});

describe("presentRequestError", () => {
  it("extracts nested field errors returned by Zod", () => {
    const error = new ApiRequestError({
      status: 422,
      code: "UNPROCESSABLE_CONTENT",
      message: "Invalid input",
      kind: "http",
      retryable: false,
      requestId: "request-456",
      details: {
        properties: {
          person: {
            properties: {
              firstName: { errors: ["First name is required"] },
              phone: { errors: ["Phone number is invalid"] },
            },
          },
        },
      },
    });

    expect(presentRequestError(error)).toMatchObject({
      message: "First name is required",
      requestId: "request-456",
      fieldErrors: [
        { field: "Person first name", message: "First name is required" },
        { field: "Person phone", message: "Phone number is invalid" },
      ],
    });
  });
});
