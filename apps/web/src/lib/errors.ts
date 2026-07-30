import { ApiRequestError } from "./api/client";

type ZodErrorTree = {
  errors?: unknown;
  properties?: unknown;
  items?: unknown;
};

export type FieldError = {
  field: string;
  message: string;
};

export type RequestErrorPresentation = {
  code: string;
  message: string;
  retryable: boolean;
  requestId?: string;
  fieldErrors: FieldError[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function fieldLabel(path: string[]) {
  if (path.length === 0) return "Form";
  return path
    .map((segment) => segment.replace(/([a-z0-9])([A-Z])/g, "$1 $2"))
    .join(" ")
    .toLowerCase()
    .replace(/^./, (character) => character.toUpperCase());
}

function collectFieldErrors(value: unknown, path: string[] = []): FieldError[] {
  if (!isRecord(value)) return [];
  const tree = value as ZodErrorTree;
  const messages = Array.isArray(tree.errors)
    ? tree.errors.filter((message): message is string => typeof message === "string")
    : [];
  const current = messages.map((message) => ({ field: fieldLabel(path), message }));
  const properties = isRecord(tree.properties)
    ? Object.entries(tree.properties).flatMap(([key, child]) =>
        collectFieldErrors(child, [...path, key]),
      )
    : [];
  const items = Array.isArray(tree.items)
    ? tree.items.flatMap((child, index) => collectFieldErrors(child, [...path, String(index + 1)]))
    : [];

  return [...current, ...properties, ...items];
}

/** Converts transport and validation failures into the single shape workspace UI consumes. */
export function presentRequestError(
  cause: unknown,
  fallback = "Could not complete the request.",
): RequestErrorPresentation {
  if (cause instanceof ApiRequestError) {
    const fieldErrors = collectFieldErrors(cause.details);
    return {
      code: cause.code,
      message: fieldErrors[0]?.message ?? cause.message,
      retryable: cause.retryable,
      requestId: cause.requestId,
      fieldErrors,
    };
  }

  return {
    code: "UNEXPECTED_ERROR",
    message: cause instanceof Error && cause.message ? cause.message : fallback,
    retryable: false,
    fieldErrors: [],
  };
}

/** Retained for small local controls that only need the primary user-facing message. */
export function errorMessage(cause: unknown, fallback = "Could not complete the request.") {
  return presentRequestError(cause, fallback).message;
}
