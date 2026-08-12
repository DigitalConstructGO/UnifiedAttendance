"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore, FolderKanban, Pencil, Plus, Trash2 } from "lucide-react";
import { useState } from "react";

import { useAccess } from "@/components/access-provider";
import { RequestErrorAlert } from "@/components/request-error-alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { clientKeys, clientsApi, type ProjectRow } from "@/lib/api";
import { personName, PROJECT_STATUS_META } from "@/lib/client-presentation";
import { presentRequestError } from "@/lib/errors";
import { formatDate } from "@/lib/format-date";

import { EmptyState, TabPanel } from "./tab-shell";

export function ProjectsTab({
  projects,
  timeZone,
  manageable,
  clientId,
  onAddProject,
  onEditProject,
}: {
  projects: ProjectRow[];
  timeZone: string;
  manageable: boolean;
  clientId: string;
  onAddProject: () => void;
  onEditProject: (row: ProjectRow) => void;
}) {
  const { can } = useAccess();
  const queryClient = useQueryClient();
  const [archiving, setArchiving] = useState<ProjectRow | null>(null);
  const [deleting, setDeleting] = useState<ProjectRow | null>(null);

  const archivedQuery = useQuery({
    queryKey: clientKeys.projects({ clientId, includeArchived: "true" }),
    queryFn: ({ signal }) => clientsApi.projects({ clientId, includeArchived: "true" }, signal),
  });
  const archived = (archivedQuery.data ?? []).filter((row) => row.project.archivedAt);

  async function refresh() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: clientKeys.projectsAll }),
      queryClient.invalidateQueries({ queryKey: clientKeys.detail(clientId) }),
    ]);
  }

  const archiveProject = useMutation({
    mutationFn: clientsApi.archiveProject,
    onSuccess: refresh,
  });
  const restoreProject = useMutation({
    mutationFn: clientsApi.restoreProject,
    onSuccess: refresh,
  });
  const deleteProject = useMutation({
    mutationFn: clientsApi.deleteProject,
    onSuccess: refresh,
  });

  const writeError = archiveProject.error ?? restoreProject.error ?? deleteProject.error;

  const addButton = manageable ? (
    <Button
      type="button"
      variant="outline"
      className="h-10 rounded-[11px] px-4 font-bold"
      onClick={onAddProject}
    >
      <Plus aria-hidden="true" />
      Add project
    </Button>
  ) : null;

  return (
    <div className="grid gap-4">
      {writeError ? (
        <RequestErrorAlert
          error={presentRequestError(writeError, "Could not change this project.")}
        />
      ) : null}

      {projects.length === 0 ? (
        <TabPanel>
          <EmptyState
            icon={<FolderKanban className="size-5" aria-hidden="true" />}
            title="No projects yet"
            hint="Work delivered for this client appears here with its progress, budget, and deadline."
          />
          {addButton ? <div className="flex justify-center pb-6">{addButton}</div> : null}
        </TabPanel>
      ) : (
        <>
          {addButton ? <div className="flex justify-end">{addButton}</div> : null}
          {projects.map((row) => {
            const { project, manager } = row;
            const status = PROJECT_STATUS_META[project.status];
            return (
              <TabPanel key={project.id} className="p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-strong text-sm font-bold">{project.name}</h3>
                  <div className="flex items-center gap-1.5">
                    <p className={`mr-1.5 text-xs font-bold ${status.className}`}>{status.label}</p>
                    {manageable ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-[9px] font-bold"
                        onClick={() => onEditProject(row)}
                      >
                        <Pencil aria-hidden="true" />
                        Edit
                      </Button>
                    ) : null}
                    {can("projects.archive") ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        aria-label={`Archive ${project.name}`}
                        className="text-destructive hover:text-destructive"
                        onClick={() => setArchiving(row)}
                      >
                        <Archive aria-hidden="true" />
                      </Button>
                    ) : null}
                  </div>
                </div>
                <dl className="mt-3.5 flex flex-wrap gap-x-7 gap-y-1.5 text-xs text-muted-foreground">
                  <div className="flex gap-1.5">
                    <dt>Manager</dt>
                    <dd className="text-strong font-semibold">
                      ·&nbsp;{personName(manager.person)}
                    </dd>
                  </div>
                  <div className="flex gap-1.5">
                    <dt>Deadline</dt>
                    <dd className="text-strong font-semibold">
                      ·&nbsp;{formatDate(project.dueOn, timeZone)}
                    </dd>
                  </div>
                </dl>
              </TabPanel>
            );
          })}
        </>
      )}

      {archived.length > 0 ? (
        <section className="grid gap-3">
          <h3 className="mt-2 text-xs font-bold tracking-[0.06em] text-muted-foreground uppercase">
            Archived projects
          </h3>
          {archived.map((row) => {
            const { project } = row;
            return (
              <TabPanel key={project.id} className="bg-[var(--surface-subtle)] p-5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-muted-foreground">{project.name}</h4>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {PROJECT_STATUS_META[project.status].label} · archived{" "}
                      {formatDate(project.archivedAt, timeZone)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {can("projects.restore") ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-[9px] font-bold"
                        disabled={restoreProject.isPending}
                        onClick={() => restoreProject.mutate(project.id)}
                      >
                        <ArchiveRestore aria-hidden="true" />
                        Restore
                      </Button>
                    ) : null}
                    {can("projects.delete") ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-8 rounded-[9px] font-bold text-destructive hover:text-destructive"
                        onClick={() => setDeleting(row)}
                      >
                        <Trash2 aria-hidden="true" />
                        Delete forever
                      </Button>
                    ) : null}
                  </div>
                </div>
              </TabPanel>
            );
          })}
        </section>
      ) : null}

      {archiving ? (
        <ConfirmDialog
          title={`Archive ${archiving.project.name}?`}
          description="It moves out of the active list into the archive below. You can restore it at any time."
          confirmLabel="Archive project"
          onCancel={() => setArchiving(null)}
          onConfirm={() => {
            archiveProject.mutate(archiving.project.id);
            setArchiving(null);
          }}
        />
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={`Delete ${deleting.project.name} forever?`}
          description="This permanently erases the project and cannot be undone. A project with invoices or documents attached will refuse to go."
          confirmLabel="Delete forever"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleteProject.mutate(deleting.project.id);
            setDeleting(null);
          }}
        />
      ) : null}
    </div>
  );
}
