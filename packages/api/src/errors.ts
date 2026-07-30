export const ERROR_STATUS = {
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_CONTENT: 422,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export type ErrorCode = keyof typeof ERROR_STATUS;

export class ApiError extends Error {
  readonly code: ErrorCode;
  readonly status: number;
  readonly details?: unknown;

  constructor(code: ErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.code = code;
    this.status = ERROR_STATUS[code];
    this.details = details;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function badRequest(message: string, details?: unknown): never {
  throw new ApiError("BAD_REQUEST", message, details);
}

export function unauthorized(message = "Authentication required"): never {
  throw new ApiError("UNAUTHORIZED", message);
}

export function forbidden(message: string): never {
  throw new ApiError("FORBIDDEN", message);
}

export function notFound(resource: string): never {
  throw new ApiError("NOT_FOUND", `${resource} not found`);
}

export function conflict(message: string): never {
  throw new ApiError("CONFLICT", message);
}
