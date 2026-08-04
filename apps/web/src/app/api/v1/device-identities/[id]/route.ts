import { closeIdentity } from "@UnifiedAttendance/api";
import { closeIdentityInput } from "@UnifiedAttendance/api/validations/devices";
import { route } from "@/lib/route";

/** Closing an identity is an update, never a delete — the history has to stay. */
export const PATCH = route({
  input: closeIdentityInput,
  handler: ({ ctx, input }) => closeIdentity(ctx, input),
});
