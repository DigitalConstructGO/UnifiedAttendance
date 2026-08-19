import { NotificationTiersWorkspace } from "@/components/notification-tiers";
import { requireAccess } from "@/lib/access-server";

export default async function NotificationsPage() {
  await requireAccess("notifications.manage");
  return <NotificationTiersWorkspace />;
}
