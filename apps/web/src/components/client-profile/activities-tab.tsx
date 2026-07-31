import { Mail, MapPinned, PhoneCall, UsersRound } from "lucide-react";

import type { CrmActivityRow } from "@/lib/api";
import { ACTIVITY_TYPE_LABELS, personName } from "@/lib/client-presentation";
import { ethiopianDate } from "@/lib/ethiopian-date";

import { EmptyState, TabPanel } from "./tab-shell";

const ACTIVITY_META = {
  call: { icon: PhoneCall, className: "text-workflow" },
  meeting: { icon: UsersRound, className: "text-info" },
  email: { icon: Mail, className: "text-warning" },
  site_visit: { icon: MapPinned, className: "text-success" },
} as const;

export function ActivitiesTab({
  activities,
  timeZone,
}: {
  activities: CrmActivityRow[];
  timeZone: string;
}) {
  if (activities.length === 0) {
    return (
      <TabPanel>
        <EmptyState
          icon={<PhoneCall className="size-5" aria-hidden="true" />}
          title="No activities recorded"
          hint="Calls, meetings, emails, and site visits will appear here."
        />
      </TabPanel>
    );
  }

  return (
    <TabPanel className="px-5 py-2">
      <ol className="divide-y divide-border">
        {activities.map(({ activity, actor }) => {
          const meta = ACTIVITY_META[activity.activityType];
          const Icon = meta.icon;
          return (
            <li key={activity.id} className="flex items-start gap-3 py-4">
              <span
                aria-hidden="true"
                className={`grid size-9 shrink-0 place-items-center rounded-[10px] bg-[var(--surface-subtle)] ${meta.className}`}
              >
                <Icon className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-strong text-sm font-bold">
                  {ACTIVITY_TYPE_LABELS[activity.activityType]}
                  <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                    · {personName(actor.person)}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{activity.summary}</p>
                {activity.details ? (
                  <p className="mt-1 text-xs text-muted-foreground">{activity.details}</p>
                ) : null}
              </div>
              <time className="shrink-0 text-xs text-muted-foreground">
                {ethiopianDate(activity.occurredAt, timeZone)}
              </time>
            </li>
          );
        })}
      </ol>
    </TabPanel>
  );
}
