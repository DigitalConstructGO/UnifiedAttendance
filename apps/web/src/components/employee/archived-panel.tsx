"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArchiveRestore, Trash2 } from "lucide-react";

import { RequestErrorAlert } from "@/components/request-error-alert";
import { Button } from "@/components/ui/button";
import { workforceApi, workforceKeys, workforceQueries } from "@/lib/api";
import { formatDate } from "@/lib/format-date";
import { presentRequestError } from "@/lib/errors";
import { firstQueryFailure } from "@/lib/query-errors";

export function ArchivedPanel({ branchId }: { branchId: string }) {
  const queryClient = useQueryClient();
  const archivedQuery = useQuery(workforceQueries.archivedEmployees(branchId));

  const invalidate = () => queryClient.invalidateQueries({ queryKey: workforceKeys.employeesAll });

  const restore = useMutation({ mutationFn: workforceApi.restoreEmployee, onSuccess: invalidate });
  const destroy = useMutation({ mutationFn: workforceApi.deleteEmployee, onSuccess: invalidate });

  const rows = archivedQuery.data ?? [];
  const loadFailure = firstQueryFailure([[archivedQuery, "Could not load the archive."]]);
  const writeError = restore.error ?? destroy.error;
  const error = writeError
    ? presentRequestError(writeError, "Could not update the archive.")
    : (loadFailure?.error ?? null);

  return (
    <section className="rounded-[18px] bg-card p-6 shadow-[var(--shadow-card)] ring-1 ring-border">
      {error ? (
        <div className="mb-4">
          <RequestErrorAlert error={error} onRetry={loadFailure?.retry} />
        </div>
      ) : null}
      {rows.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          The archive is empty. Deleting an employee from their profile moves them here first.
        </p>
      ) : (
        <ul className="divide-y divide-border">
          {rows.map((row) => (
            <li key={row.employee.id} className="flex flex-wrap items-center gap-3 py-3">
              <span className="min-w-0 flex-1">
                <span className="text-strong block truncate text-sm font-semibold">
                  {row.person.firstName} {row.person.lastName}
                </span>
                <span className="block text-xs text-muted-foreground">
                  {row.employee.employeeCode} · archived {formatDate(row.employee.archivedAt)}
                </span>
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={restore.isPending || destroy.isPending}
                className="h-9 rounded-[9px] font-bold"
                onClick={() => {
                  restore.reset();
                  destroy.reset();
                  restore.mutate(row.employee.id);
                }}
              >
                <ArchiveRestore aria-hidden="true" />
                Restore
              </Button>
              <Button
                variant="destructive"
                size="sm"
                disabled={restore.isPending || destroy.isPending}
                className="h-9 rounded-[9px] font-bold"
                onClick={() => {
                  const name = `${row.person.firstName} ${row.person.lastName}`;
                  if (
                    !window.confirm(
                      `Delete ${name} for good? Their attendance records go with them. This cannot be undone.`,
                    )
                  )
                    return;
                  restore.reset();
                  destroy.reset();
                  destroy.mutate(row.employee.id);
                }}
              >
                <Trash2 aria-hidden="true" />
                Delete forever
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
