import { type AttendanceSection, AttendanceWorkspace } from "@/components/attendance";
import { requireAccess } from "@/lib/access-server";

const attendanceSections = new Set<AttendanceSection>(["register", "corrections"]);

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  await requireAccess("attendance:read");
  const { section } = await searchParams;

  return (
    <AttendanceWorkspace
      section={
        attendanceSections.has(section as AttendanceSection)
          ? (section as AttendanceSection)
          : "register"
      }
    />
  );
}
