import { QueryCache, QueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { ApiRequestError } from "./api/client";

/**
 * A failed request surfaces the API's own message — `route()` puts it in the
 * error envelope, and `apiFetch` rethrows it as an `ApiRequestError`.
 */
export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: (error, query) => {
      const message = error instanceof ApiRequestError ? error.message : error.message;
      toast.error(message, {
        action: {
          label: "retry",
          onClick: query.invalidate,
        },
      });
    },
  }),
});
