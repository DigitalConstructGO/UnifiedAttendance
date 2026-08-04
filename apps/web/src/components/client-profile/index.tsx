"use client";

import { ArrowLeft, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { useAccess } from "@/components/access-provider";
import { RequestErrorAlert } from "@/components/request-error-alert";
import type { ProjectStatus } from "@/lib/client-presentation";
import { DEFAULT_TIME_ZONE } from "@/lib/timezone";

import { ActivitiesTab } from "./activities-tab";
import { AddContactDialog } from "./add-contact-dialog";
import { AddProjectDialog } from "./add-project-dialog";
import { AuditTab } from "./audit-tab";
import { ContactsTab } from "./contacts-tab";
import { ContractsTab } from "./contracts-tab";
import { DocumentsTab } from "./documents-tab";
import { EditClientDialog } from "./edit-client-dialog";
import { InvoicesTab } from "./invoices-tab";
import { NotesTab } from "./notes-tab";
import { OverviewTab } from "./overview-tab";
import { PaymentsTab } from "./payments-tab";
import type { ClientTab } from "./profile-model";
import { ProfileHeader } from "./profile-header";
import { ProfileTabs } from "./profile-tabs";
import { ProjectsTab } from "./projects-tab";
import { TabPanel } from "./tab-shell";
import { TimelineTab } from "./timeline-tab";
import { useClientProfile } from "./use-client-profile";

export type { ClientTab } from "./profile-model";

export function ClientProfile({
  clientId,
  opportunityId,
  tab,
}: {
  clientId: string;
  opportunityId?: string;
  tab: ClientTab;
}) {
  const { can } = useAccess();
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const profile = useClientProfile(clientId, tab, opportunityId);
  const manageable = can("clients:manage");
  const projectStatuses = (profile.client?.currentProjects ?? []).map(
    (row) => row.project.status,
  ) as ProjectStatus[];
  const timeZone = profile.client?.branch.timezone ?? DEFAULT_TIME_ZONE;
  const opportunity = profile.opportunity?.client?.id === clientId ? profile.opportunity : null;

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
              opportunity={opportunity}
              health={profile.health}
              timeZone={timeZone}
              manageable={manageable}
              onAddContact={() => setContactDialogOpen(true)}
              onEdit={() => setEditDialogOpen(true)}
            />
            <ProfileTabs clientId={clientId} opportunityId={opportunityId} active={tab} />
          </div>

          {profile.tabLoading ? (
            <TabPanel>
              <div className="grid min-h-56 place-items-center">
                <LoaderCircle className="animate-spin text-primary" aria-label={`Loading ${tab}`} />
              </div>
            </TabPanel>
          ) : null}

          {!profile.tabLoading && tab === "overview" ? (
            <OverviewTab
              client={profile.client}
              projects={profile.projects}
              invoices={profile.invoices}
              primaryContact={profile.primaryContact}
              health={profile.health}
              lastActivityAt={profile.lastActivityAt}
              timeZone={timeZone}
            />
          ) : null}
          {!profile.tabLoading && tab === "contacts" ? (
            <ContactsTab contacts={profile.contacts} />
          ) : null}
          {!profile.tabLoading && tab === "projects" ? (
            <ProjectsTab
              projects={profile.projects}
              timeZone={timeZone}
              manageable={manageable}
              onAddProject={() => setProjectDialogOpen(true)}
            />
          ) : null}
          {!profile.tabLoading && tab === "contracts" ? (
            <ContractsTab contracts={profile.contracts} timeZone={timeZone} />
          ) : null}
          {!profile.tabLoading && tab === "invoices" ? (
            <InvoicesTab invoices={profile.invoices} timeZone={timeZone} />
          ) : null}
          {!profile.tabLoading && tab === "payments" ? (
            <PaymentsTab
              invoices={profile.invoices}
              branchId={profile.client.branch.id}
              timeZone={timeZone}
            />
          ) : null}
          {!profile.tabLoading && tab === "documents" ? (
            <DocumentsTab
              clientId={clientId}
              branchId={profile.client.branch.id}
              opportunityId={opportunity?.opportunity.id}
              documents={profile.documents}
              timeZone={timeZone}
            />
          ) : null}
          {!profile.tabLoading && tab === "activities" ? (
            <ActivitiesTab activities={profile.activities} timeZone={timeZone} />
          ) : null}
          {!profile.tabLoading && tab === "notes" ? (
            <NotesTab notes={profile.notes} timeZone={timeZone} />
          ) : null}
          {!profile.tabLoading && tab === "timeline" ? (
            <TimelineTab timeline={profile.timeline} timeZone={timeZone} />
          ) : null}
          {!profile.tabLoading && tab === "audit" ? (
            <AuditTab entries={profile.audit} timeZone={timeZone} />
          ) : null}

          {contactDialogOpen ? (
            <AddContactDialog clientId={clientId} onClose={() => setContactDialogOpen(false)} />
          ) : null}
          {editDialogOpen ? (
            <EditClientDialog
              client={profile.client.client}
              onClose={() => setEditDialogOpen(false)}
            />
          ) : null}
          {projectDialogOpen ? (
            <AddProjectDialog
              clientId={clientId}
              branchId={profile.client.branch.id}
              onClose={() => setProjectDialogOpen(false)}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
