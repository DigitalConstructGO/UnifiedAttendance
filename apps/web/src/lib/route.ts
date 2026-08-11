import { z, type ZodType } from "zod";

import { ApiError, createContext, isApiError, type Context } from "@UnifiedAttendance/api";

import { createChildLogger } from "./logger";

type RouteSegment = { params?: Promise<Record<string, string | string[] | undefined>> };

export type RouteHandler = (request: Request, segment?: RouteSegment) => Promise<Response>;

type Access = "session" | "public";

type NoInput = ZodType<undefined>;

type RouteConfig<TSchema extends ZodType, TResult> = {
  input?: TSchema;
  access?: Access;
  status?: number;
  handler: (args: {
    ctx: Context;
    input: z.output<TSchema>;
    request: Request;
  }) => Promise<TResult> | TResult;
};


export function route<TResult, TSchema extends ZodType = NoInput>(
  config: RouteConfig<TSchema, TResult>,
): RouteHandler {
  return async function handleRequest(request, segment) {
    const requestId = crypto.randomUUID();
    try {
      const ctx = await createContext(request);
      if ((config.access ?? "session") === "session" && !ctx.session) {
        throw new ApiError("UNAUTHORIZED", "Authentication required");
      }

      const handlerArgs = { ctx, request } as { ctx: Context; request: Request; input?: unknown };
      if (config.input) {
        const raw = { ...(await readInput(request)), ...(await readParams(segment)) };
        const parsed = config.input.safeParse(raw);
        if (!parsed.success) {
          throw new ApiError(
            "UNPROCESSABLE_CONTENT",
            "Invalid input",
            z.treeifyError(parsed.error),
          );
        }
        handlerArgs.input = parsed.data;
      }

      const result = await (config.handler as (args: unknown) => Promise<TResult>)(handlerArgs);
      return json(result ?? null, config.status ?? 200, requestId);
    } catch (error) {
      return errorResponse(error, requestId);
    }
  };
}

async function readInput(request: Request): Promise<Record<string, unknown>> {
  if (request.method === "POST" || request.method === "PUT" || request.method === "PATCH") {
    const text = await request.text();
    if (text.length === 0) return {};
    try {
      const body = JSON.parse(text) as unknown;
      if (body === null || typeof body !== "object" || Array.isArray(body)) {
        throw new ApiError("BAD_REQUEST", "Request body must be a JSON object");
      }
      return body as Record<string, unknown>;
    } catch (error) {
      if (isApiError(error)) throw error;
      throw new ApiError("BAD_REQUEST", "Request body is not valid JSON");
    }
  }

  const query: Record<string, unknown> = {};
  for (const [key, value] of new URL(request.url).searchParams) {
    if (value !== "") query[key] = value;
  }
  return query;
}

async function readParams(segment: RouteSegment | undefined) {
  const params = await segment?.params;
  if (!params) return {};
  return Object.fromEntries(
    Object.entries(params).filter(([, value]) => typeof value === "string"),
  );
}

function json(body: unknown, status: number, requestId: string) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", "x-request-id": requestId },
  });
}

const PG_FOREIGN_KEY_VIOLATION = "23503";
const PG_UNIQUE_VIOLATION = "23505";

export function errorResponse(error: unknown, requestId = crypto.randomUUID()): Response {

  if (error instanceof Error && "code" in error && error.code === PG_FOREIGN_KEY_VIOLATION) {
    return json(
      {
        error: {
          code: "CONFLICT",
          message: "Other records still depend on this one, so it cannot be deleted.",
          requestId,
        },
      },
      409,
      requestId,
    );
  }
  if (error instanceof Error && "code" in error && error.code === PG_UNIQUE_VIOLATION) {
    return json(
      {
        error: {
          code: "CONFLICT",
          message: "Something with this name already exists.",
          requestId,
        },
      },
      409,
      requestId,
    );
  }
  if (isApiError(error)) {
    return json(
      {
        error: {
          code: error.code,
          message: error.message,
          details: error.details,
          requestId,
        },
      },
      error.status,
      requestId,
    );
  }
  createChildLogger({ requestId }).error({ err: error }, "Unhandled API error");
  return json(
    {
      error: {
        code: "INTERNAL_SERVER_ERROR",
        message: "Something went wrong",
        requestId,
      },
    },
    500,
    requestId,
  );
}
