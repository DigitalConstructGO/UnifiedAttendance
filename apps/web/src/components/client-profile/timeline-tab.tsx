import {
  AlertTriangle,
  Banknote,
  CalendarDays,
  FileSignature,
  History,
  ReceiptText,
  UserRoundCheck,
} from "lucide-react";

import type { ClientTimeline } from "@/lib/api";
import { formatDate } from "@/lib/format-date";

import { EmptyState, TabPanel } from "./tab-shell";

const TIMELINE_META = {
  payment_overdue: { icon: AlertTriangle, className: "text-destructive" },
  invoice_payment_received: { icon: Banknote, className: "text-success" },
  invoice_generated: { icon: ReceiptText, className: "text-info" },
  commercial_contract_signed: { icon: FileSignature, className: "text-info" },
  opportunity_stage_changed: { icon: CalendarDays, className: "text-workflow" },
  account_owner_assigned: { icon: UserRoundCheck, className: "text-workflow" },
  client_created: { icon: UserRoundCheck, className: "text-success" },
  crm_activity: { icon: CalendarDays, className: "text-muted-foreground" },
} as const;

export function TimelineTab({
  timeline,
  timeZone,
}: {
  timeline: ClientTimeline;
  timeZone: string;
}) {
  if (timeline.length === 0) {
    return (
      <TabPanel>
        <EmptyState
          icon={<History className="size-5" aria-hidden="true" />}
          title="No timeline events"
          hint="Commercial, delivery, billing, and relationship events will appear here."
        />
      </TabPanel>
    );
  }

  return (
    <TabPanel className="p-5">
      <ol className="relative grid gap-0 before:absolute before:top-5 before:bottom-5 before:left-[18px] before:w-px before:bg-border">
        {timeline.map((item) => {
          const meta =
            TIMELINE_META[item.kind as keyof typeof TIMELINE_META] ?? TIMELINE_META.crm_activity;
          const Icon = meta.icon;
          return (
            <li key={`${item.sourceType}-${item.sourceId}`} className="relative flex gap-3 py-2.5">
              <span
                aria-hidden="true"
                className={`z-10 grid size-9 shrink-0 place-items-center rounded-[10px] bg-[var(--surface-subtle)] ${meta.className}`}
              >
                <Icon className="size-4.5" />
              </span>
              <div className="min-w-0 flex-1 pt-0.5">
                <p className="text-strong text-xs font-bold">
                  {item.title}
                  <time className="ml-2 font-medium text-muted-foreground">
                    {formatDate(item.occurredAt, timeZone)}
                  </time>
                </p>
                {item.detail ? (
                  <p className="mt-0.5 text-xs text-muted-foreground">{item.detail}</p>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>
    </TabPanel>
  );
}
