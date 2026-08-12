"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { RequestErrorAlert } from "@/components/request-error-alert";
import {
  type Branch,
  type Department,
  workforceApi,
  workforceKeys,
  workforceQueries,
} from "@/lib/api";
import { presentRequestError } from "@/lib/errors";
import { firstQueryFailure } from "@/lib/query-errors";
import {
  ACTIVE_STATUSES,
  ACTIVE_STATUS_META,
  type ActiveStatus,
} from "@/lib/workforce-presentation";

import { compactSelectClass } from "./fields";

export function DepartmentManager({ branches }: { branches: Branch[] }) {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState<Department | null>(null);

  const departmentsQuery = useQuery(workforceQueries.departments());
  const items = departmentsQuery.data ?? [];

  /** Every workspace that lists departments reads the same key, so one call refreshes all of them. */
  async function invalidateDepartments() {
    await queryClient.invalidateQueries({ queryKey: workforceKeys.departments });
  }

  const saveDepartment = useMutation({
    mutationFn: (values: {
      id?: string;
      name: string;
      branchId: string | null;
      status: ActiveStatus;
    }) =>
      values.id
        ? workforceApi.updateDepartment({ ...values, id: values.id })
        : workforceApi.createDepartment(values),
    onSuccess: async () => {
      setEditing(null);
      await invalidateDepartments();
    },
  });

  const deleteDepartment = useMutation({
    mutationFn: workforceApi.deleteDepartment,
    onSuccess: async (removed) => {
      if (editing?.id === removed.id) setEditing(null);
      await invalidateDepartments();
    },
  });

  const busy = saveDepartment.isPending || deleteDepartment.isPending;
  const writeError = saveDepartment.error
    ? presentRequestError(saveDepartment.error, "Could not save the department.")
    : deleteDepartment.error
      ? presentRequestError(deleteDepartment.error, "Could not delete the department.")
      : null;
  const loadFailure = firstQueryFailure([[departmentsQuery, "Could not load departments."]]);
  const error = writeError ?? loadFailure?.error ?? null;

  function save(form: HTMLFormElement) {
    const data = new FormData(form);
    saveDepartment.reset();
    deleteDepartment.reset();
    saveDepartment.mutate(
      {
        id: editing?.id,
        name: String(data.get("name")),
        branchId: String(data.get("branchId")) || null,
        status: String(data.get("status")) as ActiveStatus,
      },
      { onSuccess: () => form.reset() },
    );
  }

  function remove(item: Department) {
    setDeleting(item);
  }

  return (
    <Card className="rounded-[18px] shadow-[var(--shadow-card)] ring-border">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="font-bold">Departments</CardTitle>
        <p className="text-xs text-muted-foreground">Company-wide and branch-specific teams.</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <form
          className="grid gap-3 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            save(event.currentTarget);
          }}
        >
          <Input
            required
            name="name"
            placeholder="Department name"
            defaultValue={editing?.name}
            key={editing?.id ?? "new-name"}
            className="h-9 rounded-[9px]"
          />
          <select
            name="branchId"
            defaultValue={editing?.branchId ?? ""}
            key={editing?.id ?? "new-branch"}
            className={compactSelectClass}
          >
            <option value="">Company-wide</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={editing?.status ?? ACTIVE_STATUSES[0]}
            key={editing?.id ?? "new-status"}
            className={compactSelectClass}
          >
            {ACTIVE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ACTIVE_STATUS_META[status].label}
              </option>
            ))}
          </select>
          <Button className="h-9 rounded-[9px] font-bold" disabled={busy}>
            {editing ? "Save changes" : "Add department"}
          </Button>
          {editing ? (
            <Button type="button" variant="ghost" disabled={busy} onClick={() => setEditing(null)}>
              Cancel edit
            </Button>
          ) : null}
        </form>
        {error ? (
          <RequestErrorAlert error={error} onRetry={loadFailure?.retry} focusOnError />
        ) : null}
        <ul className="divide-y divide-border text-sm">
          {items.map((item) => (
            <li key={item.id} className="flex min-h-12 items-center justify-between gap-3 py-2">
              <span>
                <span className="text-strong font-bold">{item.name}</span>
                <span className="ml-2 rounded-md bg-muted px-2 py-1 text-[0.625rem] font-bold text-muted-foreground">
                  {item.status}
                </span>
              </span>
              <span className="flex gap-1">
                <Button size="xs" variant="ghost" onClick={() => setEditing(item)}>
                  Edit
                </Button>
                <Button
                  size="xs"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => remove(item)}
                >
                  Delete
                </Button>
              </span>
            </li>
          ))}
        </ul>
        {items.length === 0 ? (
          <p className="py-5 text-center text-xs text-muted-foreground">
            No departments have been created yet.
          </p>
        ) : null}
      </CardContent>

      {deleting ? (
        <ConfirmDialog
          title={`Delete ${deleting.name}?`}
          description="The department is removed and its employees keep no department assignment."
          confirmLabel="Delete department"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            saveDepartment.reset();
            deleteDepartment.reset();
            deleteDepartment.mutate(deleting.id);
            setDeleting(null);
          }}
        />
      ) : null}
    </Card>
  );
}
