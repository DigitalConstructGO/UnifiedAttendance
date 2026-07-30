import { listPermissions } from "@UnifiedAttendance/api";
import { route } from "@/lib/route";

export const GET = route({ handler: ({ ctx }) => listPermissions(ctx) });
