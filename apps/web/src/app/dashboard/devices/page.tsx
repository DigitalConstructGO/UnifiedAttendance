import { type DeviceSection, DevicesWorkspace } from "@/components/devices";
import { requireAccess } from "@/lib/access-server";

const deviceSections = new Set<DeviceSection>(["readers", "enrolments"]);

export default async function DevicesPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  await requireAccess("devices.read");
  const { section } = await searchParams;

  return (
    <DevicesWorkspace
      section={
        deviceSections.has(section as DeviceSection) ? (section as DeviceSection) : "readers"
      }
    />
  );
}
