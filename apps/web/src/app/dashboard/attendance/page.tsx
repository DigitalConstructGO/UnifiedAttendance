import { AttendanceWorkspace } from "@/components/attendance-workspace";
import { requireAccess } from "@/lib/access-server";

export default async function AttendancePage() {
  await requireAccess("attendance:read");
  return <AttendanceWorkspace />;
}
