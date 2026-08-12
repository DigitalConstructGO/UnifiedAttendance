"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderKanban } from "lucide-react";
import { useState } from "react";

import { Input } from "@/components/ui/input";
import { clientKeys, clientsApi, workforceQueries, type ProjectRow } from "@/lib/api";
import { personName, PROJECT_STATUS_META } from "@/lib/client-presentation";
import { presentRequestError } from "@/lib/errors";

import { DialogField, dialogFieldClass, RecordDialog } from "../client-agreements/record-dialog";

const PROJECT_STATUS_OPTIONS = ["planning", "in_progress", "completed", "cancelled"] as const;
type ProjectStatusOption = (typeof PROJECT_STATUS_OPTIONS)[number];

export function EditProjectDialog({
  row,
  branchId,
  onClose,
}: {
  row: ProjectRow;
  branchId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<ProjectStatusOption>(row.project.status);

  const employeesQuery = useQuery(workforceQueries.employees(branchId));
  const employees = employeesQuery.data ?? [];

  const updateProject = useMutation({
    mutationFn: clientsApi.updateProject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clientKeys.all });
      await queryClient.invalidateQueries({ queryKey: clientKeys.projectsAll });
      onClose();
    },
  });

  return (
    <RecordDialog
      title="Edit project"
      description="Move it along, hand it over, or fix its dates"
      icon={<FolderKanban className="size-5" />}
      busy={updateProject.isPending}
      submitLabel="Save changes"
      error={
        updateProject.error
          ? presentRequestError(updateProject.error, "Could not save this project.")
          : null
      }
      onClose={onClose}
      onSubmit={(form) => {
        const data = new FormData(form);
        const startsOn = String(data.get("startsOn") ?? "").trim();
        const completedOn = String(data.get("completedOn") ?? "").trim();
        updateProject.mutate({
          id: row.project.id,
          name: String(data.get("name") ?? "").trim(),
          managerEmployeeId: String(data.get("managerEmployeeId") ?? ""),
          status,
          dueOn: String(data.get("dueOn") ?? ""),
          startsOn: startsOn || null,
          completedOn: status === "completed" ? completedOn : null,
        });
      }}
    >
      <DialogField label="Project name">
        <Input required name="name" defaultValue={row.project.name} />
      </DialogField>

      <div className="grid gap-4 sm:grid-cols-2">
        <DialogField label="Manager">
          <select
            required
            name="managerEmployeeId"
            className={dialogFieldClass}
            defaultValue={row.project.managerEmployeeId}
          >
            {employees.map((employee) => (
              <option key={employee.employee.id} value={employee.employee.id}>
                {personName(employee.person)}
              </option>
            ))}
          </select>
        </DialogField>

        <DialogField label="Status">
          <select
            name="status"
            className={dialogFieldClass}
            value={status}
            onChange={(event) => setStatus(event.target.value as ProjectStatusOption)}
          >
            {PROJECT_STATUS_OPTIONS.map((option) => (
              <option key={option} value={option}>
                {PROJECT_STATUS_META[option].label}
              </option>
            ))}
          </select>
        </DialogField>

        <DialogField label="Start date">
          <Input
            name="startsOn"
            type="date"
            className={dialogFieldClass}
            defaultValue={row.project.startsOn ?? ""}
          />
        </DialogField>

        <DialogField label="Deadline">
          <Input
            required
            name="dueOn"
            type="date"
            className={dialogFieldClass}
            defaultValue={row.project.dueOn}
          />
        </DialogField>

        {status === "completed" ? (
          <DialogField label="Completed on">
            <Input
              required
              name="completedOn"
              type="date"
              className={dialogFieldClass}
              defaultValue={row.project.completedOn ?? ""}
            />
          </DialogField>
        ) : null}
      </div>
    </RecordDialog>
  );
}
