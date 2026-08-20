"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAccess } from "@/components/access-provider";
import { RequestErrorAlert } from "@/components/request-error-alert";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { clientKeys, clientsApi, type ProjectRow } from "@/lib/api";
import { clientName, personName, type ProjectStatus } from "@/lib/client-presentation";
import { presentRequestError } from "@/lib/errors";
import { DEFAULT_TIME_ZONE } from "@/lib/timezone";

import { ActivitiesTab } from "./activities-tab";
import { AddContactDialog } from "./add-contact-dialog";
import { AddProjectDialog } from "./add-project-dialog";
import { EditProjectDialog } from "./edit-project-dialog";
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
  const router = useRouter();
  const queryClient = useQueryClient();
  const [contactDialogOpen, setContactDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [projectDialogOpen, setProjectDialogOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectRow | null>(null);
  const [archiving, setArchiving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const profile = useClientProfile(clientId, tab, opportunityId);
  const manageable = can("clients.update");

  const archiveClient = useMutation({
    mutationFn: clientsApi.archive,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clientKeys.all });
    },
  });
  const restoreClient = useMutation({
    mutationFn: clientsApi.restore,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clientKeys.all });
    },
  });
  const deleteClient = useMutation({
    mutationFn: clientsApi.deleteForever,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clientKeys.all });
      router.push("/dashboard/clients");
    },
  });
  const lifecycleError = archiveClient.error ?? restoreClient.error ?? deleteClient.error ?? null;
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
      {lifecycleError ? (
        <RequestErrorAlert
          error={presentRequestError(lifecycleError, "Could not change this client.")}
        />
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
              canArchive={can("clients.archive")}
              canRestore={can("clients.restore")}
              canDelete={can("clients.delete")}
              restoreBusy={restoreClient.isPending}
              onAddContact={() => setContactDialogOpen(true)}
              onEdit={() => setEditDialogOpen(true)}
              onArchive={() => setArchiving(true)}
              onRestore={() => restoreClient.mutate(clientId)}
              onDeleteForever={() => setDeleting(true)}
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
              clientId={clientId}
              onAddProject={() => setProjectDialogOpen(true)}
              onEditProject={setEditingProject}
            />
          ) : null}
          {!profile.tabLoading && tab === "contracts" ? (
            <ContractsTab clientId={clientId} contracts={profile.contracts} timeZone={timeZone} />
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
            <ActivitiesTab
              activities={profile.activities}
              timeZone={timeZone}
              clientId={clientId}
              branchId={profile.client.branch.id}
              ownerEmployeeId={profile.client.client.ownerEmployeeId}
            />
          ) : null}
          {!profile.tabLoading && tab === "notes" ? (
            <NotesTab
              notes={profile.notes}
              timeZone={timeZone}
              clientId={clientId}
              branchId={profile.client.branch.id}
              ownerEmployeeId={profile.client.client.ownerEmployeeId}
            />
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
              client={{
                ...profile.client.client,
                industry: profile.client.industry.name,
                clientType: profile.client.clientType.name,
                owner: personName(profile.client.owner.person),
              }}
              branchId={profile.client.branch.id}
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
          {editingProject ? (
            <EditProjectDialog
              row={editingProject}
              branchId={profile.client.branch.id}
              onClose={() => setEditingProject(null)}
            />
          ) : null}
          {archiving ? (
            <ConfirmDialog
              title={`Archive ${clientName(profile.client.client)}?`}
              description="It moves out of the active directory into the archive. You can restore it at any time."
              confirmLabel="Archive client"
              onCancel={() => setArchiving(false)}
              onConfirm={() => {
                archiveClient.mutate(clientId);
                setArchiving(false);
              }}
            />
          ) : null}
          {deleting ? (
            <ConfirmDialog
              title={`Delete ${clientName(profile.client.client)} forever?`}
              description="This permanently erases the client — including its contacts, notes, and activities — and cannot be undone. A client with commercial contracts, projects, invoices, or documents attached will refuse to go."
              confirmLabel="Delete forever"
              onCancel={() => setDeleting(false)}
              onConfirm={() => {
                deleteClient.mutate(clientId);
                setDeleting(false);
              }}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
