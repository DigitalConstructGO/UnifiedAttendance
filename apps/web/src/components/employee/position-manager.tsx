"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RequestErrorAlert } from "@/components/request-error-alert";
import { type Position, workforceApi, workforceKeys, workforceQueries } from "@/lib/api";
import { presentRequestError } from "@/lib/errors";
import { firstQueryFailure } from "@/lib/query-errors";
import {
  ACTIVE_STATUSES,
  ACTIVE_STATUS_META,
  type ActiveStatus,
} from "@/lib/workforce-presentation";

import { compactSelectClass } from "./fields";

export function PositionManager() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Position | null>(null);

  const positionsQuery = useQuery(workforceQueries.positions());
  const positions = positionsQuery.data ?? [];
  const departmentsQuery = useQuery(workforceQueries.departments());
  const departments = departmentsQuery.data ?? [];
  const departmentNames = new Map(departments.map((item) => [item.id, item.name]));

  async function invalidatePositions() {
    await queryClient.invalidateQueries({ queryKey: workforceKeys.positions });
  }

  const savePosition = useMutation({
    mutationFn: (values: {
      id?: string;
      title: string;
      description: string | null;
      status: ActiveStatus;
      departmentId: string | null;
    }) =>
      values.id
        ? workforceApi.updatePosition({ ...values, id: values.id })
        : workforceApi.createPosition(values),
    onSuccess: async () => {
      setEditing(null);
      await invalidatePositions();
    },
  });

  const deletePosition = useMutation({
    mutationFn: workforceApi.deletePosition,
    onSuccess: async (removed) => {
      if (editing?.id === removed.id) setEditing(null);
      await invalidatePositions();
    },
  });

  const busy = savePosition.isPending || deletePosition.isPending;
  const writeError = savePosition.error
    ? presentRequestError(savePosition.error, "Could not save the position.")
    : deletePosition.error
      ? presentRequestError(deletePosition.error, "Could not delete the position.")
      : null;
  const loadFailure = firstQueryFailure([
    [positionsQuery, "Could not load positions."],
    [departmentsQuery, "Could not load departments."],
  ]);
  const error = writeError ?? loadFailure?.error ?? null;

  function save(form: HTMLFormElement) {
    const data = new FormData(form);
    savePosition.reset();
    deletePosition.reset();
    savePosition.mutate(
      {
        id: editing?.id,
        title: String(data.get("title")),
        description: String(data.get("description")) || null,
        status: String(data.get("status")) as ActiveStatus,
        departmentId: String(data.get("departmentId")) || null,
      },
      { onSuccess: () => form.reset() },
    );
  }

  function remove(position: Position) {
    if (!window.confirm(`Delete position ${position.title}?`)) return;
    savePosition.reset();
    deletePosition.reset();
    deletePosition.mutate(position.id);
  }

  return (
    <Card className="rounded-[18px] shadow-[var(--shadow-card)] ring-border">
      <CardHeader className="border-b border-border pb-4">
        <CardTitle className="font-bold">{editing ? "Edit position" : "Positions"}</CardTitle>
        <p className="text-xs text-muted-foreground">
          Job titles available when assigning employees.
        </p>
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
            name="title"
            placeholder="Position title"
            defaultValue={editing?.title}
            key={editing?.id ?? "new-title"}
            className="h-9 rounded-[9px]"
          />
          <Input
            name="description"
            placeholder="Description"
            defaultValue={editing?.description ?? ""}
            key={`${editing?.id ?? "new"}-description`}
            className="h-9 rounded-[9px]"
          />
          <select
            name="departmentId"
            defaultValue={editing?.departmentId ?? ""}
            key={`${editing?.id ?? "new"}-department`}
            aria-label="Department"
            className={compactSelectClass}
          >
            <option value="">Any department</option>
            {departments.map((department) => (
              <option key={department.id} value={department.id}>
                {department.name}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={editing?.status ?? ACTIVE_STATUSES[0]}
            key={`${editing?.id ?? "new"}-status`}
            className={compactSelectClass}
          >
            {ACTIVE_STATUSES.map((status) => (
              <option key={status} value={status}>
                {ACTIVE_STATUS_META[status].label}
              </option>
            ))}
          </select>
          <Button className="h-9 rounded-[9px] font-bold" disabled={busy}>
            {editing ? "Save changes" : "Add position"}
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
          {positions.map((position) => (
            <li key={position.id} className="flex min-h-12 items-center justify-between gap-3 py-2">
              <span>
                <span className="text-strong font-bold">{position.title}</span>
                <span className="ml-2 rounded-md bg-muted px-2 py-1 text-[0.625rem] font-bold text-muted-foreground">
                  {position.status}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {position.departmentId
                    ? (departmentNames.get(position.departmentId) ?? "Unknown department")
                    : "Any department"}
                  {position.description ? ` · ${position.description}` : ""}
                </span>
              </span>
              <span className="flex gap-1">
                <Button size="xs" variant="ghost" onClick={() => setEditing(position)}>
                  Edit
                </Button>
                <Button
                  size="xs"
                  variant="destructive"
                  disabled={busy}
                  onClick={() => remove(position)}
                >
                  Delete
                </Button>
              </span>
            </li>
          ))}
        </ul>
        {positions.length === 0 ? (
          <p className="py-5 text-center text-xs text-muted-foreground">
            No positions have been created yet.
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}
