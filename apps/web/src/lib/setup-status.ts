import { getSetupStatus as loadSetupStatus } from "@UnifiedAttendance/api";
import { cache } from "react";

/**
 * Cached per request, so the dashboard layout and the setup page can each ask
 * without a second round trip. The query itself lives in the api package —
 * apps/web owns HTTP, not database access.
 */
export const getSetupStatus = cache(loadSetupStatus);
