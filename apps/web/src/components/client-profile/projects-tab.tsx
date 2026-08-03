import { FolderKanban } from "lucide-react";

import type { ProjectRow } from "@/lib/api";
import {
  money,
  personName,
  PROJECT_PROGRESS_TONE,
  PROJECT_STATUS_META,
} from "@/lib/client-presentation";
import { ethiopianDate } from "@/lib/ethiopian-date";

import { EmptyState, TabPanel } from "./tab-shell";

export function ProjectsTab({ projects, timeZone }: { projects: ProjectRow[]; timeZone: string }) {
  if (projects.length === 0) {
    return (
      <TabPanel>
        <EmptyState
          icon={<FolderKanban className="size-5" aria-hidden="true" />}
          title="No projects yet"
          hint="Work delivered for this client appears here with its progress, budget, and deadline."
        />
      </TabPanel>
    );
  }

  return (
    <div className="grid gap-4">
      {projects.map(({ project, manager }) => {
        const status = PROJECT_STATUS_META[project.status];
        return (
          <TabPanel key={project.id} className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-strong text-sm font-bold">{project.name}</h3>
              <p className={`text-xs font-bold ${status.className}`}>
                {status.label}
              </p>
            </div>
            <dl className="mt-3.5 flex flex-wrap gap-x-7 gap-y-1.5 text-xs text-muted-foreground">
              <div className="flex gap-1.5">
                <dt>Manager</dt>
                <dd className="text-strong font-semibold">·&nbsp;{personName(manager.person)}</dd>
              </div>
              <div className="flex gap-1.5">
                <dt>Deadline</dt>
                <dd className="text-strong font-semibold">
                  ·&nbsp;{ethiopianDate(project.dueOn, timeZone)}
                </dd>
              </div>
            </dl>
          </TabPanel>
        );
      })}
    </div>
  );
}
