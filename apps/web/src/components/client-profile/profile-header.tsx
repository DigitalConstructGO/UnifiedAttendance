import { Briefcase, CalendarDays, MapPin, MoreHorizontal, UserPlus, UserRound } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type { ClientRow } from "@/lib/api";
import { clientName, initials, personName, type ProjectStatus } from "@/lib/client-presentation";
import { ethiopianDate } from "@/lib/ethiopian-date";

import { clientTabHref } from "./profile-model";

/**
 * The headline beside the client name. Per the domain model this is a read-model
 * precedence, not a stored field: an in-progress project outranks everything else.
 */
function directoryStatus(projectStatuses: ProjectStatus[]) {
  if (projectStatuses.includes("in_progress")) return "Active project";
  if (projectStatuses.length > 0 && projectStatuses.every((status) => status === "completed"))
    return "Completed";
  return null;
}

export function ProfileHeader({
  client,
  projectStatuses,
  timeZone,
  manageable,
}: {
  client: ClientRow;
  projectStatuses: ProjectStatus[];
  timeZone: string;
  manageable: boolean;
}) {
  const headline = directoryStatus(projectStatuses);

  return (
    <header className="rounded-[18px] bg-card px-6 pt-6 shadow-[var(--shadow-card)] ring-1 ring-border">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-4">
          <span
            aria-hidden="true"
            className="grid size-14 shrink-0 place-items-center rounded-[14px] bg-workflow/90 font-heading text-lg font-bold text-white"
          >
            {initials(clientName(client.client))}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-strong truncate font-heading text-xl font-bold tracking-[-0.03em]">
                {clientName(client.client)}
              </h1>
              {headline ? (
                <span className="rounded-full bg-success/10 px-2.5 py-1 text-[0.6875rem] font-bold text-success">
                  {headline}
                </span>
              ) : null}
            </div>
            <dl className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Client code</dt>
                <dd className="font-semibold">{client.client.clientCode}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Industry</dt>
                <Briefcase className="size-3.5" aria-hidden="true" />
                <dd>{client.industry.name}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Account owner</dt>
                <UserRound className="size-3.5" aria-hidden="true" />
                <dd>{personName(client.owner.person)}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <dt className="sr-only">Branch</dt>
                <MapPin className="size-3.5" aria-hidden="true" />
                <dd>{client.branch.name}</dd>
              </div>
              <div className="flex items-center gap-1.5">
                <CalendarDays className="size-3.5" aria-hidden="true" />
                <dt>Client since</dt>
                <dd className="text-strong font-semibold">
                  {ethiopianDate(client.client.relationshipStartedOn, timeZone)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {manageable ? (
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="h-10 rounded-[11px] px-4 font-bold">
              <Link href={clientTabHref(client.client.id, "contacts")}>
                <UserPlus aria-hidden="true" />
                Add contact
              </Link>
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="size-10 rounded-[11px]"
              aria-label="More client actions"
            >
              <MoreHorizontal aria-hidden="true" />
            </Button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
