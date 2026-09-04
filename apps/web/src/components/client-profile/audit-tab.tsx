import { History } from "lucide-react";

import type { ClientAuditEntry } from "@/lib/api";
import { initials } from "@/lib/client-presentation";
import { clockTime, formatDate } from "@/lib/format-date";

import { EmptyState, TabPanel } from "./tab-shell";

function actionLabel(action: string) {
  return action.replaceAll(".", " ").replaceAll("_", " ");
}

export function AuditTab({ entries, timeZone }: { entries: ClientAuditEntry[]; timeZone: string }) {
  if (entries.length === 0) {
    return (
      <TabPanel>
        <EmptyState
          icon={<History className="size-5" aria-hidden="true" />}
          title="No audit entries"
          hint="Attributable changes to this client will appear here."
        />
      </TabPanel>
    );
  }

  return (
    <TabPanel className="overflow-hidden">
      <ol className="divide-y divide-border">
        {entries.map(({ entry, actorUser }) => {
          const actor = actorUser?.name || (entry.actorType === "system" ? "System" : "User");
          return (
            <li key={entry.id} className="flex items-center gap-3 px-5 py-4">
              <span
                aria-hidden="true"
                className="grid size-8 shrink-0 place-items-center rounded-[9px] bg-muted text-[0.6875rem] font-bold text-muted-foreground"
              >
                {initials(actor)}
              </span>
              <p className="text-strong min-w-0 flex-1 text-xs">
                <strong>{actor}</strong>{" "}
                <span className="capitalize">{actionLabel(entry.action)}</span>
              </p>
              <time className="shrink-0 text-xs text-muted-foreground">
                {formatDate(entry.occurredAt, timeZone)} · {clockTime(entry.occurredAt, timeZone)}
              </time>
            </li>
          );
        })}
      </ol>
    </TabPanel>
  );
}
