import { PhoneCall } from "lucide-react";

import type { CrmActivityRow } from "@/lib/api";
import { personName } from "@/lib/client-presentation";
import { ethiopianDate } from "@/lib/ethiopian-date";

import { EmptyState, TabPanel } from "./tab-shell";

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
        {activities.map(({ activity, actor, clientContact }) => {
          return (
            <li key={activity.id} className="flex items-start gap-3 py-4">
              <span
                aria-hidden="true"
                className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-[var(--surface-subtle)] text-info"
              >
                <PhoneCall className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-strong text-sm font-bold">
                  {clientContact ? (
                    <span>Contact: {personName(clientContact)}</span>
                  ) : (
                    <span>General Contact</span>
                  )}
                  <span className="ml-1.5 text-xs font-medium text-muted-foreground">
                    · Logged by {personName(actor.person)}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{activity.note}</p>
              </div>
              <time className="shrink-0 text-xs text-muted-foreground">
                {ethiopianDate(activity.contactDate, timeZone)}
              </time>
            </li>
          );
        })}
      </ol>
    </TabPanel>
  );
}
