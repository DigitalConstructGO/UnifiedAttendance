import { Check } from "lucide-react";

import { RequestErrorAlert } from "@/components/request-error-alert";
import type { RequestErrorPresentation } from "@/lib/errors";

/** The success/error pair every workspace section shares. */
export function WorkspaceBanners({
  notice,
  error,
  onRetry,
}: {
  notice: string | null;
  error: RequestErrorPresentation | null;
  onRetry?: () => void;
}) {
  return (
    <>
      {notice ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-[11px] bg-success/8 px-4 py-3 text-sm text-success ring-1 ring-success/20"
        >
          <Check className="size-4" aria-hidden="true" />
          {notice}
        </div>
      ) : null}
      {error ? <RequestErrorAlert error={error} onRetry={onRetry} /> : null}
    </>
  );
}
