import { assignIdentity, listIdentities } from "@UnifiedAttendance/api";
import {
  assignIdentityInput,
  listIdentitiesInput,
} from "@UnifiedAttendance/api/validations/devices";
import { route } from "@/lib/route";

export const GET = route({
  input: listIdentitiesInput,
  handler: ({ ctx, input }) => listIdentities(ctx, input),
});

export const POST = route({
  input: assignIdentityInput,
  status: 201,
  handler: ({ ctx, input }) => assignIdentity(ctx, input),
});
