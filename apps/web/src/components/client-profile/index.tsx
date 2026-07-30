"use client";

import {
  ArrowLeft,
  ClipboardList,
  FileText,
  History,
  LoaderCircle,
  MessageSquare,
  Phone,
} from "lucide-react";
import Link from "next/link";

import { useAccess } from "@/components/access-provider";
import { RequestErrorAlert } from "@/components/request-error-alert";
import type { ProjectStatus } from "@/lib/client-presentation";
import { DEFAULT_TIME_ZONE } from "@/lib/timezone";

import { ContactsTab } from "./contacts-tab";
import { ContractsTab } from "./contracts-tab";
import { OverviewTab } from "./overview-tab";
import type { ClientTab } from "./profile-model";
import { ProfileHeader } from "./profile-header";
import { ProfileTabs } from "./profile-tabs";
import { ProjectsTab } from "./projects-tab";
import { PendingTab } from "./tab-shell";
import { useClientProfile } from "./use-client-profile";

export type { ClientTab } from "./profile-model";
export { isClientTab } from "./profile-model";

/** Tabs still waiting on their service, each with the copy that explains the gap. */
const PENDING_TAB_CONTENT = {
  documents: {
    icon: <FileText className="size-5" aria-hidden="true" />,
    title: "Documents are not available yet",
    hint: "Versioned client files — contracts, proposals, registrations — will list here once the document service ships.",
  },
  activities: {
    icon: <Phone className="size-5" aria-hidden="true" />,
    title: "Activities are not available yet",
    hint: "Recorded calls, meetings, emails, and site visits will list here once the activity service ships.",
  },
  notes: {
    icon: <MessageSquare className="size-5" aria-hidden="true" />,
    title: "Notes are not available yet",
    hint: "Internal notes about this client, including pinned ones, will list here once the note service ships.",
  },
  timeline: {
    icon: <ClipboardList className="size-5" aria-hidden="true" />,
    title: "Timeline is not available yet",
    hint: "The business-event history — proposals, contracts, invoices, payments — is a read model built from other records.",
  },
  audit: {
    icon: <History className="size-5" aria-hidden="true" />,
    title: "Audit log is not available yet",
    hint: "The immutable record of who changed what, and when, will list here once the audit service ships.",
  },
} as const;

export function ClientProfile({ clientId, tab }: { clientId: string; tab: ClientTab }) {
  const { can } = useAccess();
  const profile = useClientProfile(clientId);
  const manageable = can("clients:manage");
  const projectStatuses = profile.projects.map((row) => row.project.status) as ProjectStatus[];
  // Dates render in the managing branch's zone, falling back until the client loads.
  const timeZone = profile.client?.branch.timezone ?? DEFAULT_TIME_ZONE;

  return (
    <div className="mx-auto w-full max-w-[1240px] space-y-5">
      <Link
        href="/dashboard/clients"
        className="inline-flex items-center gap-2 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All clients
      </Link>

      {profile.error ? (
        <RequestErrorAlert error={profile.error} onRetry={profile.retry} focusOnError />
      ) : null}

      {profile.loading ? (
        <div className="grid min-h-64 place-items-center">
          <LoaderCircle className="animate-spin text-primary" aria-label="Loading client" />
        </div>
      ) : null}

      {profile.client ? (
        <>
          <div className="overflow-hidden rounded-[18px] bg-card shadow-[var(--shadow-card)] ring-1 ring-border">
            <ProfileHeader
              client={profile.client}
              projectStatuses={projectStatuses}
              timeZone={timeZone}
              manageable={manageable}
            />
            <ProfileTabs clientId={clientId} active={tab} />
          </div>

          {tab === "overview" ? (
            <OverviewTab
              client={profile.client}
              projects={profile.projects}
              primaryContact={profile.primaryContact}
              timeZone={timeZone}
            />
          ) : null}
          {tab === "contacts" ? <ContactsTab contacts={profile.contacts} /> : null}
          {tab === "projects" ? (
            <ProjectsTab projects={profile.projects} timeZone={timeZone} />
          ) : null}
          {tab === "contracts" ? (
            <ContractsTab contracts={profile.contracts} timeZone={timeZone} />
          ) : null}
          {tab in PENDING_TAB_CONTENT ? (
            <PendingTab {...PENDING_TAB_CONTENT[tab as keyof typeof PENDING_TAB_CONTENT]} />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
