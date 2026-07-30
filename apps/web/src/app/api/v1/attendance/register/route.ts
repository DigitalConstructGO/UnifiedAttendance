import { listDailyRegister } from "@UnifiedAttendance/api";
import { listDailyRegisterInput } from "@UnifiedAttendance/api/validations/attendance";

import { route } from "@/lib/route";

export const GET = route({
  input: listDailyRegisterInput,
  handler: ({ ctx, input }) => listDailyRegister(ctx, input),
});
