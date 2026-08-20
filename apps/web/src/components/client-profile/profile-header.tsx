import {
  Archive,
  ArchiveRestore,
  Banknote,
  Briefcase,
  CalendarDays,
  MapPin,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserPlus,
  UserRound,
} from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import type {
  ClientProfile as ClientProfileProjection,
  ClientRow,
  OpportunityRow,
} from "@/lib/api";
import { clientName, initials, personName, type ProjectStatus } from "@/lib/client-presentation";
import { formatDate } from "@/lib/format-date";

import { clientTabHref } from "./profile-model";

function directoryStatus(projectStatuses: ProjectStatus[]) {
  if (projectStatuses.includes("in_progress")) return "Active project";
  if (projectStatuses.length > 0 && projectStatuses.every((status) => status === "completed"))
    return "Completed";
  return null;
}

export function ProfileHeader({
  client,
  projectStatuses,
  opportunity,
  health,
  timeZone,
  manageable,
  canArchive,
  canRestore,
  canDelete,
  restoreBusy,
  onAddContact,
  onEdit,
  onArchive,
  onRestore,
  onDeleteForever,
}: {
  client: ClientRow;
  projectStatuses: ProjectStatus[];
  opportunity: OpportunityRow | null;
  health: ClientProfileProjection["health"] | null;
  timeZone: string;
  manageable: boolean;
  canArchive: boolean;
  canRestore: boolean;
  canDelete: boolean;
  restoreBusy: boolean;
  onAddContact: () => void;
  onEdit: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDeleteForever: () => void;
}) {
  const archived = client.client.status === "archived";
  const headline = opportunity?.pipelineStage.name ?? directoryStatus(projectStatuses);
  const headlineTone =
    opportunity?.pipelineStage.outcome === "lost"
      ? "bg-destructive/10 text-destructive"
      : opportunity?.pipelineStage.outcome === "won"
        ? "bg-success/10 text-success"
        : "bg-muted text-muted-foreground";
  const healthLabel =
    health?.band === "healthy" ? "Healthy" : health?.band === "watch" ? "Watch" : "At risk";
  const healthTone =
    health?.band === "healthy"
      ? "text-success"
      : health?.band === "watch"
        ? "text-warning"
        : "text-destructive";

  return (
    <header className="px-6 pt-6 pb-5">
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
              {archived ? (
                <span className="rounded-md bg-destructive/10 px-2.5 py-1 text-[0.6875rem] font-bold text-destructive">
                  Archived
                </span>
              ) : headline ? (
                <span
                  className={`rounded-md px-2.5 py-1 text-[0.6875rem] font-bold ${headlineTone}`}
                >
                  {headline}
                </span>
              ) : null}
              {health ? (
                <span
                  className={`inline-flex items-center gap-1.5 text-xs font-bold ${healthTone}`}
                >
                  <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
                  {healthLabel}
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
                  {formatDate(client.client.relationshipStartedOn, timeZone)}
                </dd>
              </div>
            </dl>
          </div>
        </div>

        {manageable ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              asChild
              className="h-10 rounded-[11px] bg-sidebar px-4 font-bold text-sidebar-foreground hover:bg-sidebar/90"
            >
              <Link href={clientTabHref(client.client.id, "payments", opportunity?.opportunity.id)}>
                <Banknote aria-hidden="true" />
                Record payment
              </Link>
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-[11px] px-4 font-bold"
              onClick={onAddContact}
            >
              <UserPlus aria-hidden="true" />
              Add contact
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-[11px] px-4 font-bold"
              onClick={onEdit}
            >
              <Pencil aria-hidden="true" />
              Edit details
            </Button>
            <Button asChild variant="outline" size="icon" className="size-10 rounded-[11px]">
              <Link
                href={clientTabHref(client.client.id, "audit", opportunity?.opportunity.id)}
                aria-label="Open client audit log"
              >
                <MoreHorizontal aria-hidden="true" />
              </Link>
            </Button>
            {archived ? (
              <>
                {canRestore ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-[11px] px-4 font-bold"
                    disabled={restoreBusy}
                    onClick={onRestore}
                  >
                    <ArchiveRestore aria-hidden="true" />
                    Restore
                  </Button>
                ) : null}
                {canDelete ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="size-10 rounded-[11px] text-destructive hover:text-destructive"
                    aria-label={`Delete ${clientName(client.client)} forever`}
                    onClick={onDeleteForever}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                ) : null}
              </>
            ) : canArchive ? (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-10 rounded-[11px] text-destructive hover:text-destructive"
                aria-label={`Archive ${clientName(client.client)}`}
                onClick={onArchive}
              >
                <Archive aria-hidden="true" />
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}
