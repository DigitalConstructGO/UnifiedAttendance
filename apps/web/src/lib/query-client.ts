import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiRequestError } from "./api/client";

const QUERY_RETRY_LIMIT = 2;
const DEFAULT_STALE_TIME = 30 * 1000;

function shouldRetryQuery(failureCount: number, error: unknown) {
  return error instanceof ApiRequestError && error.retryable && failureCount < QUERY_RETRY_LIMIT;
}

/**
 * Queries may retry only transient API failures. Mutations retain TanStack Query's
 * default no-retry behavior so a failed write is never replayed implicitly.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: shouldRetryQuery,
      staleTime: DEFAULT_STALE_TIME,
      refetchOnWindowFocus: false,
    },
  },
  queryCache: new QueryCache({
    onError: (error, query) => {
      if (error instanceof ApiRequestError && error.kind === "aborted") return;
      // A mounted workspace renders the failure inline through RequestErrorAlert.
      // The toast is only for failures nothing is left on screen to report —
      // a background refetch, or an invalidation after the view unmounted.
      if (query.getObserversCount() > 0) return;
      const message = error instanceof Error ? error.message : "Could not load this information.";
      toast.error(message, {
        action:
          error instanceof ApiRequestError && error.retryable
            ? {
                label: "Retry",
                onClick: () => void query.invalidate(),
              }
            : undefined,
      });
    },
  }),
});
