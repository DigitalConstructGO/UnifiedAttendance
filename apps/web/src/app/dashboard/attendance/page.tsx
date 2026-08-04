import { AttendanceWorkspace } from "@/components/attendance";
import { requireAccess } from "@/lib/access-server";

export default async function AttendancePage() {
  await requireAccess("attendance:read");
  return <AttendanceWorkspace />;
}
