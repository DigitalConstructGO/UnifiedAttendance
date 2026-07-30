import { presentRequestError, type RequestErrorPresentation } from "./errors";

type FailableQuery = {
  error: unknown;
  refetch: () => unknown;
};

export type QueryFailure = {
  error: RequestErrorPresentation;
  retry: () => void;
};

export function firstQueryFailure(
  queries: ReadonlyArray<readonly [query: FailableQuery, fallback: string]>,
): QueryFailure | null {
  for (const [query, fallback] of queries) {
    if (query.error === null || query.error === undefined) continue;
    return {
      error: presentRequestError(query.error, fallback),
      retry: () => void query.refetch(),
    };
  }
  return null;
}
