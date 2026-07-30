import { listRoles } from "@UnifiedAttendance/api";
import { route } from "@/lib/route";

export const GET = route({ handler: ({ ctx }) => listRoles(ctx) });
