import { createUser, listUsers } from "@UnifiedAttendance/api";
import { createUserInput } from "@UnifiedAttendance/api/validations/access";
import { route } from "@/lib/route";

export const GET = route({ handler: ({ ctx }) => listUsers(ctx) });

export const POST = route({
  input: createUserInput,
  status: 201,
  handler: ({ ctx, input }) => createUser(ctx, input),
});
