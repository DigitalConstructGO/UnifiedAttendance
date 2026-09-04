"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [deleting, setDeleting] = useState<Department | null>(null);
  const formOpen = adding || editing !== null;

  const nameRef = useRef<HTMLInputElement>(null);
  const addButtonRef = useRef<HTMLButtonElement>(null);
  const restoreFocusRef = useRef<HTMLElement | null>(null);
  const shouldRestoreRef = useRef(false);

  useEffect(() => {
    if (formOpen) {
      nameRef.current?.focus();
      return;
    }
    if (!shouldRestoreRef.current) return;
    shouldRestoreRef.current = false;
    const target = restoreFocusRef.current;
    restoreFocusRef.current = null;
    // The row that opened the form may have re-rendered away after a save.
    if (target?.isConnected) target.focus();
    else addButtonRef.current?.focus();
  }, [formOpen, editing?.id]);

  function rememberTrigger() {
    restoreFocusRef.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
  }

  function openAdd() {
    rememberTrigger();
    setEditing(null);
    setAdding(true);
  }

  function openEdit(item: Department) {
    rememberTrigger();
    setAdding(false);
    setEditing(item);
  }

  function closeForm() {
    shouldRestoreRef.current = true;
    setAdding(false);
    setEditing(null);
  }

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
      closeForm();
      await invalidateDepartments();
    },
  });

  const deleteDepartment = useMutation({
    mutationFn: workforceApi.deleteDepartment,
    onSuccess: async (removed) => {
      if (editing?.id === removed.id) closeForm();
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
        <CardTitle className="font-bold">
          {editing ? "Edit department" : adding ? "New department" : "Departments"}
        </CardTitle>
        <p className="text-xs text-muted-foreground">Company-wide and branch-specific teams.</p>
        <CardAction>
          {formOpen ? (
            <span
              role="status"
              className="rounded-md bg-primary/10 px-2.5 py-1 text-[0.6875rem] font-bold text-primary"
            >
              {editing ? "Editing" : "Adding"}
            </span>
          ) : (
            <Button
              ref={addButtonRef}
              type="button"
              variant="outline"
              size="sm"
              className="h-8 rounded-[9px] font-bold"
              aria-controls="department-form"
              onClick={openAdd}
            >
              <Plus aria-hidden="true" />
              Add department
            </Button>
          )}
        </CardAction>
      </CardHeader>
      <CardContent className="space-y-4">
        {formOpen ? (
          <form
            id="department-form"
            className="grid gap-3 border-b border-border pb-4 sm:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              save(event.currentTarget);
            }}
          >
            <Input
              ref={nameRef}
              required
              name="name"
              placeholder="Department name"
              aria-label="Department name"
              defaultValue={editing?.name}
              key={editing?.id ?? "new-name"}
              className="h-9 rounded-[9px]"
            />
            <select
              name="branchId"
              defaultValue={editing?.branchId ?? ""}
              key={editing?.id ?? "new-branch"}
              aria-label="Branch"
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
              aria-label="Status"
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
            <Button type="button" variant="ghost" disabled={busy} onClick={closeForm}>
              Cancel
            </Button>
          </form>
        ) : null}
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
                <Button
                  size="xs"
                  variant="ghost"
                  aria-label={`Edit ${item.name}`}
                  onClick={() => openEdit(item)}
                >
                  Edit
                </Button>
                <Button
                  size="xs"
                  variant="destructive"
                  disabled={busy}
                  aria-label={`Delete ${item.name}`}
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
            No departments yet. Use “Add department” to create the first one.
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
