"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { FolderKanban } from "lucide-react";

import { Input } from "@/components/ui/input";
import { clientKeys, clientsApi, workforceQueries } from "@/lib/api";
import { personName, PROJECT_STATUS_META } from "@/lib/client-presentation";
import { presentRequestError } from "@/lib/errors";

import { DialogField, dialogFieldClass, RecordDialog } from "../client-agreements/record-dialog";

export function AddProjectDialog({
  clientId,
  branchId,
  onClose,
}: {
  clientId: string;
  branchId: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();

  const employeesQuery = useQuery(workforceQueries.employees(branchId));
  const employees = employeesQuery.data ?? [];

  const createProject = useMutation({
    mutationFn: clientsApi.createProject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clientKeys.all });
      onClose();
    },
  });

  return (
    <RecordDialog
      title="Add project"
      description="Work delivered for this client"
      icon={<FolderKanban className="size-5" />}
      busy={createProject.isPending}
      submitLabel="Add project"
      error={
        createProject.error
          ? presentRequestError(createProject.error, "Could not create this project.")
          : null
      }
      onClose={onClose}
      onSubmit={(form) => {
        const data = new FormData(form);
        const startsOn = String(data.get("startsOn") ?? "").trim();
        createProject.mutate({
          clientId,
          branchId,
          name: String(data.get("name") ?? "").trim(),
          managerEmployeeId: String(data.get("managerEmployeeId") ?? ""),
          status: String(data.get("status") ?? "planning") as "planning",
          dueOn: String(data.get("dueOn") ?? ""),
          startsOn: startsOn || null,
        });
      }}
    >
      <DialogField label="Project name">
        <Input required name="name" placeholder="Core platform rollout" />
      </DialogField>

      <div className="grid gap-4 sm:grid-cols-2">
        <DialogField label="Manager">
          <select required name="managerEmployeeId" className={dialogFieldClass}>
            <option value="">Select an employee</option>
            {employees.map((row) => (
              <option key={row.employee.id} value={row.employee.id}>
                {personName(row.person)}
              </option>
            ))}
          </select>
        </DialogField>

        <DialogField label="Status">
          <select name="status" className={dialogFieldClass} defaultValue="planning">
            {(["planning", "in_progress", "cancelled"] as const).map((status) => (
              <option key={status} value={status}>
                {PROJECT_STATUS_META[status].label}
              </option>
            ))}
          </select>
        </DialogField>

        <DialogField label="Start date">
          <Input name="startsOn" type="date" className={dialogFieldClass} />
        </DialogField>

        <DialogField label="Deadline">
          <Input required name="dueOn" type="date" className={dialogFieldClass} />
        </DialogField>
      </div>
    </RecordDialog>
  );
}
