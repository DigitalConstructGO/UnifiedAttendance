import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { Search, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { RequestErrorAlert } from "@/components/request-error-alert";
import { type Cosigner, workforceApi, workforceKeys } from "@/lib/api";
import { presentRequestError } from "@/lib/errors";

import { COSIGNER_TABLE_PAGE_SIZE } from "./contract-model";
import { cosignerColumns } from "./cosigner-columns";
import { CosignerEditForm } from "./cosigner-edit-form";
import { DataTable, TableEmptyState, TableFooter } from "./data-table";
import { uploadCosignerDocuments, type UploadFieldStatus, type UploadStatusMap } from "./uploads";

export function CosignerDirectory({
  items,
  manageable,
}: {
  items: Cosigner[];
  manageable: boolean;
}) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Cosigner | null>(null);
  const [deleting, setDeleting] = useState<Cosigner | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [uploadStates, setUploadStates] = useState<UploadStatusMap>({});

  function noteUpload(field: string, status: UploadFieldStatus) {
    setUploadStates((previous) => ({ ...previous, [field]: status }));
  }

  async function invalidateCosigners() {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: workforceKeys.cosigners }),
      queryClient.invalidateQueries({ queryKey: workforceKeys.contracts }),
      queryClient.invalidateQueries({ queryKey: workforceKeys.documentsAll }),
    ]);
  }

  const saveCosigner = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      await workforceApi.updateCosigner({
        id,
        fullName: String(data.get("fullName")),
        phone: String(data.get("phone")),
        workplace: String(data.get("workplace")),
      });
      return uploadCosignerDocuments(data, id, noteUpload);
    },
    onSuccess: async (failures) => {
      await invalidateCosigners();
      if (failures.length > 0) {
        setNotice(`Cosigner saved, but these uploads failed: ${failures.join("; ")}.`);
        return;
      }
      setNotice("Cosigner details and selected documents saved.");
      setEditing(null);
    },
  });

  const deleteCosigner = useMutation({
    mutationFn: workforceApi.deleteCosigner,
    onSuccess: async (removed) => {
      if (editing?.id === removed.id) setEditing(null);
      await invalidateCosigners();
      setNotice("Cosigner deleted.");
    },
  });

  const busy = saveCosigner.isPending || deleteCosigner.isPending;
  const uploadingCount = Object.values(uploadStates).filter(
    (status) => status.state === "uploading",
  ).length;
  const uploadProgress =
    uploadingCount > 0
      ? `Uploading ${uploadingCount} file${uploadingCount === 1 ? "" : "s"}…`
      : null;
  const error = saveCosigner.error
    ? presentRequestError(saveCosigner.error, "Could not save the cosigner.")
    : deleteCosigner.error
      ? presentRequestError(deleteCosigner.error, "Could not delete the cosigner.")
      : null;

  function clearFeedback() {
    setNotice(null);
    saveCosigner.reset();
    deleteCosigner.reset();
  }

  function save(form: HTMLFormElement) {
    if (!editing) return;
    clearFeedback();
    setUploadStates({});
    saveCosigner.mutate({ id: editing.id, data: new FormData(form) });
  }

  function remove(item: Cosigner) {
    setDeleting(item);
  }

  const columns = useMemo(
    () =>
      cosignerColumns({
        manageable,
        busy,
        onEdit: setEditing,
        onDelete: remove,
      }),
    [busy, manageable],
  );
  const table = useReactTable({
    data: items,
    columns,
    state: { globalFilter: search },
    onGlobalFilterChange: setSearch,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: COSIGNER_TABLE_PAGE_SIZE } },
  });

  return (
    <div className="space-y-5">
      {notice ? <p className="text-sm text-success">{notice}</p> : null}
      {error ? <RequestErrorAlert error={error} focusOnError /> : null}
      {editing ? (
        <CosignerEditForm
          editing={editing}
          busy={busy}
          uploadProgress={uploadProgress}
          uploadStates={uploadStates}
          onSubmit={save}
          onCancel={() => setEditing(null)}
        />
      ) : null}

      <Card className="gap-0 rounded-[18px] py-0 shadow-[var(--shadow-card)] ring-border">
        <CardHeader className="border-b border-border px-4 py-4">
          <label className="relative block">
            <span className="sr-only">Search cosigners</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
                table.setPageIndex(0);
              }}
              className="h-10 rounded-[11px] bg-[var(--surface-subtle)] pr-3 pl-9"
              placeholder="Search cosigner, phone, or workplace…"
            />
          </label>
        </CardHeader>
        <CardContent className="p-0">
          <DataTable table={table} minWidth="720px" cellClassName="text-muted-foreground" />
          {table.getRowModel().rows.length === 0 ? (
            <TableEmptyState
              icon={
                <UsersRound className="mx-auto size-7 text-muted-foreground" aria-hidden="true" />
              }
              title="No cosigners found"
              hint="Cosigners are created as a required part of a new contract."
            />
          ) : null}
          <TableFooter table={table} itemLabel="cosigners" />
        </CardContent>
      </Card>

      {deleting ? (
        <ConfirmDialog
          title={`Delete cosigner ${deleting.fullName}?`}
          description="Their record leaves the directory. A cosigner still named on a contract cannot be deleted."
          confirmLabel="Delete cosigner"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            clearFeedback();
            deleteCosigner.mutate(deleting.id);
            setDeleting(null);
          }}
        />
      ) : null}
    </div>
  );
}
