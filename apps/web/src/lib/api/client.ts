/** Everything the browser sends goes through here, so one place owns URLs, cookies and errors. */
const BASE_PATH = "/api/v1";

type ErrorBody = { error?: { code?: string; message?: string; details?: unknown } };

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.details = details;
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

  const response = await fetch(withQuery(path, query), {
    method,
    signal,
    credentials: "include",
    headers: body === undefined ? undefined : { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  const payload = text.length > 0 ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    const { error } = (payload ?? {}) as ErrorBody;
    throw new ApiRequestError(
      response.status,
      error?.code ?? "INTERNAL_SERVER_ERROR",
      error?.message ?? response.statusText,
      error?.details,
    );
  }

  return payload as TResult;
}
