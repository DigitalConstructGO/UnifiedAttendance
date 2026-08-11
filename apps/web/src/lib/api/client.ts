import axios, { AxiosError, type AxiosResponse } from "axios";

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

const BASE_PATH = "/api/v1";

const http = axios.create({
  baseURL:
    typeof window === "undefined"
      ? BASE_PATH
      : new URL(BASE_PATH, window.location.origin).toString(),
  adapter: "fetch",
  withCredentials: true,
  validateStatus: () => true,
  transformResponse: [(data: unknown) => data],
});

function requestIdOf(response: AxiosResponse) {
  const header: unknown = response.headers["x-request-id"];
  return typeof header === "string" ? header : undefined;
}

function parsePayload(response: AxiosResponse): unknown {
  const raw: unknown = response.data;
  if (raw === null || raw === undefined || raw === "") return null;
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw) as unknown;
  } catch (cause) {
    throw new ApiRequestError({
      status: response.status,
      code: "INVALID_RESPONSE",
      message: "The server returned an unreadable response.",
      kind: "invalid_response",
      retryable: retryableStatus(response.status),
      requestId: requestIdOf(response),
      cause,
    });
  }
}

function cleanQuery(query?: QueryParams) {
  if (!query) return undefined;
  const params: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null) params[key] = String(value);
  }
  return params;
}

export async function apiFetch<TResult>(
  path: string,
  options: RequestOptions = {},
): Promise<TResult> {
  const { method = "GET", body, query, signal } = options;

  let response: AxiosResponse;
  try {
    response = await http.request({
      url: path,
      method,
      signal,
      params: cleanQuery(query),
      data: body === undefined ? undefined : body,
    });
  } catch (cause) {
    const aborted = cause instanceof AxiosError && cause.code === AxiosError.ERR_CANCELED;
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

  const payload = parsePayload(response);

  if (response.status < 200 || response.status >= 300) {
    const { error } = (payload ?? {}) as ErrorBody;
    throw new ApiRequestError({
      status: response.status,
      code: error?.code ?? "HTTP_ERROR",
      message: error?.message ?? "The request could not be completed.",
      kind: "http",
      retryable: retryableStatus(response.status),
      details: error?.details,
      requestId: error?.requestId ?? requestIdOf(response),
    });
  }

  return payload as TResult;
}
