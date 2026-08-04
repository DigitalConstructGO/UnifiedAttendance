/** Everything the browser sends goes through here, so one place owns URLs, cookies and errors. */
const BASE_PATH = "/api/v1";

const RETRYABLE_HTTP_STATUS_MIN = 500;
const REQUEST_TIMEOUT_STATUS = 408;
const RATE_LIMITED_STATUS = 429;

type ErrorBody = {
  error?: { code?: string; message?: string; details?: unknown; requestId?: string };
};

export type ApiRequestErrorKind = "aborted" | "http" | "invalid_response" | "network";

type ApiRequestErrorOptions = {
  status: number;
  code: string;
  message: string;
  kind: ApiRequestErrorKind;
  retryable: boolean;
  details?: unknown;
  requestId?: string;
  cause?: unknown;
};

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly kind: ApiRequestErrorKind;
  readonly retryable: boolean;
  readonly details?: unknown;
  readonly requestId?: string;

  constructor({
    status,
    code,
    message,
    kind,
    retryable,
    details,
    requestId,
    cause,
  }: ApiRequestErrorOptions) {
    super(message, { cause });
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.kind = kind;
    this.retryable = retryable;
    this.details = details;
    this.requestId = requestId;
  }
}

export type JsonOf<T> = T extends Date
  ? string
  : T extends (infer Item)[]
    ? JsonOf<Item>[]
    : T extends object
      ? { [Key in keyof T]: JsonOf<T[Key]> }
      : T;

export type QueryParams = Record<string, string | number | boolean | null | undefined>;

type RequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: QueryParams;
  signal?: AbortSignal;
};

function retryableStatus(status: number) {
  return (
    status === REQUEST_TIMEOUT_STATUS ||
    status === RATE_LIMITED_STATUS ||
    status >= RETRYABLE_HTTP_STATUS_MIN
  );
}

function isAbortError(cause: unknown) {
  return cause instanceof DOMException && cause.name === "AbortError";
}

async function readPayload(response: Response): Promise<unknown> {
  const text = await response.text();
  if (text.length === 0) return null;

  try {
    return JSON.parse(text) as unknown;
  } catch (cause) {
    throw new ApiRequestError({
      status: response.status,
      code: "INVALID_RESPONSE",
      message: "The server returned an unreadable response.",
      kind: "invalid_response",
      retryable: retryableStatus(response.status),
      requestId: response.headers.get("x-request-id") ?? undefined,
      cause,
    });
  }
}

function withQuery(path: string, query?: QueryParams) {
  if (!query) return `${BASE_PATH}${path}`;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) search.set(key, String(value));
  }
  const queryString = search.toString();
  return queryString ? `${BASE_PATH}${path}?${queryString}` : `${BASE_PATH}${path}`;
}

export async function apiFetch<TResult>(
  path: string,
  options: RequestOptions = {},
): Promise<TResult> {
  const { method = "GET", body, query, signal } = options;

  let response: Response;
  try {
    response = await fetch(withQuery(path, query), {
      method,
      signal,
      credentials: "include",
      headers: body === undefined ? undefined : { "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (cause) {
    const aborted = isAbortError(cause);
    throw new ApiRequestError({
      status: 0,
      code: aborted ? "REQUEST_ABORTED" : "NETWORK_ERROR",
      message: aborted
        ? "Request cancelled."
        : "Unable to reach the server. Check your connection and try again.",
      kind: aborted ? "aborted" : "network",
      retryable: !aborted,
      cause,
    });
  }

  const payload = await readPayload(response);

  if (!response.ok) {
    const { error } = (payload ?? {}) as ErrorBody;
    throw new ApiRequestError({
      status: response.status,
      code: error?.code ?? "HTTP_ERROR",
      message: error?.message ?? "The request could not be completed.",
      kind: "http",
      retryable: retryableStatus(response.status),
      details: error?.details,
      requestId: error?.requestId ?? response.headers.get("x-request-id") ?? undefined,
    });
  }

  return payload as TResult;
}
