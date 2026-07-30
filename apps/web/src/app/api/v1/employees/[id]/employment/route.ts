import { listEmploymentPeriods, transitionEmployment } from "@UnifiedAttendance/api";
import {
  resourceIdInput,
  transitionEmploymentInput,
} from "@UnifiedAttendance/api/validations/workforce";

import { route } from "@/lib/route";

export const GET = route({
  input: resourceIdInput,
  handler: ({ ctx, input }) => listEmploymentPeriods(ctx, { employeeId: input.id }),
});

export const POST = route({
  input: transitionEmploymentInput,
  status: 201,
  handler: ({ ctx, input }) => transitionEmployment(ctx, input),
});
