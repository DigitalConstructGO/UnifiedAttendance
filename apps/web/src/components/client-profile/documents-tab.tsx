"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileText, LockKeyhole, ShieldCheck, Trash2, Upload } from "lucide-react";
import { useState } from "react";

import { useAccess } from "@/components/access-provider";
import { RequestErrorAlert } from "@/components/request-error-alert";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { Input } from "@/components/ui/input";
import { clientKeys, clientsApi, workforceQueries, type ClientDocumentRow } from "@/lib/api";
import {
  CLIENT_DOCUMENT_KINDS,
  DOCUMENT_KIND_LABELS,
  fileSize,
  personName,
  type ClientDocumentKind,
} from "@/lib/client-presentation";
import { formatDate } from "@/lib/format-date";
import { presentRequestError } from "@/lib/errors";

import { DialogField, dialogFieldClass, RecordDialog } from "../client-agreements/record-dialog";
import { EmptyState, TabPanel } from "./tab-shell";

const DOCUMENT_KIND_ICONS = {
  contract: FileText,
  proposal: FileText,
  registration: ShieldCheck,
  nda: LockKeyhole,
  invoice: FileText,
} as const;

export function DocumentsTab({
  clientId,
  branchId,
  opportunityId,
  documents,
  timeZone,
}: {
  clientId: string;
  branchId: string;
  opportunityId?: string;
  documents: ClientDocumentRow[];
  timeZone: string;
}) {
  const { can } = useAccess();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState<ClientDocumentRow["document"] | null>(null);
  const employeesQuery = useQuery({
    ...workforceQueries.employees(branchId),
    enabled: dialogOpen && branchId.length > 0,
  });

  const upload = useMutation({
    mutationFn: ({
      metadata,
      file,
    }: {
      metadata: {
        clientId: string;
        opportunityId?: string;
        kind: ClientDocumentKind;
        uploadedByEmployeeId: string;
      };
      file: File;
    }) => clientsApi.uploadDocument(metadata, file),
    onSuccess: async () => {
      setDialogOpen(false);
      await queryClient.invalidateQueries({ queryKey: clientKeys.documents(clientId) });
    },
  });
  const download = useMutation({
    mutationFn: (id: string) => clientsApi.document(id),
    onSuccess: ({ downloadUrl }) => {
      window.location.assign(downloadUrl);
    },
  });
  const deleteDocument = useMutation({
    mutationFn: clientsApi.deleteDocument,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: clientKeys.documents(clientId) });
    },
  });

  const employees = employeesQuery.data ?? [];
  const canManage = can("client_documents.upload");
  const canDelete = can("client_documents.delete");
  const latestDocuments = documents.filter(
    ({ document }, index, rows) =>
      rows.findIndex(
        ({ document: candidate }) => candidate.logicalDocumentId === document.logicalDocumentId,
      ) === index,
  );

  return (
    <div className="space-y-4">
      {canManage ? (
        <div className="flex justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-[11px] px-4 font-bold"
            onClick={() => {
              upload.reset();
              setDialogOpen(true);
            }}
          >
            <Upload aria-hidden="true" />
            Upload document
          </Button>
        </div>
      ) : null}

      {download.error ? (
        <RequestErrorAlert
          error={presentRequestError(download.error, "Could not prepare this document download.")}
        />
      ) : null}
      {deleteDocument.error ? (
        <RequestErrorAlert
          error={presentRequestError(deleteDocument.error, "Could not delete this document.")}
        />
      ) : null}

      {latestDocuments.length === 0 ? (
        <TabPanel>
          <EmptyState
            icon={<FileText className="size-5" aria-hidden="true" />}
            title="No documents yet"
            hint="Contracts, proposals, registrations, NDAs, and invoices will appear here."
          />
        </TabPanel>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {latestDocuments.map(({ document }) => {
            const Icon = DOCUMENT_KIND_ICONS[document.kind];
            return (
              <div
                key={document.id}
                className="relative rounded-[14px] bg-card p-4 shadow-[var(--shadow-card)] ring-1 ring-border"
              >
                <button
                  type="button"
                  className="block w-full text-left transition-colors hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                  onClick={() => download.mutate(document.id)}
                  disabled={download.isPending}
                >
                  <span className="flex items-start gap-3 pr-8">
                    <span
                      aria-hidden="true"
                      className="grid size-9 shrink-0 place-items-center rounded-[10px] bg-info/10 text-info"
                    >
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="text-strong block truncate text-xs font-bold">
                        {document.fileName}
                      </span>
                      <span className="mt-0.5 block text-[0.6875rem] text-muted-foreground">
                        {DOCUMENT_KIND_LABELS[document.kind]} · v{document.version}
                      </span>
                    </span>
                    <Download
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                  </span>
                  <span className="mt-4 flex justify-between gap-3 text-[0.6875rem] text-muted-foreground">
                    <span>{formatDate(document.uploadedAt, timeZone)}</span>
                    <span>{fileSize(document.contentLength)}</span>
                  </span>
                </button>
                {canDelete ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    className="absolute top-3 right-3 text-destructive hover:text-destructive"
                    aria-label={`Delete ${document.fileName}`}
                    onClick={() => setDeleting(document)}
                  >
                    <Trash2 aria-hidden="true" />
                  </Button>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {dialogOpen ? (
        <RecordDialog
          title="Upload document"
          description="The file is stored privately and downloaded with a short-lived URL"
          icon={<Upload className="size-5" />}
          busy={upload.isPending}
          submitLabel="Upload document"
          error={
            upload.error
              ? presentRequestError(upload.error, "Could not upload this document.")
              : null
          }
          onClose={() => setDialogOpen(false)}
          onSubmit={(form) => {
            const data = new FormData(form);
            const file = data.get("file");
            if (!(file instanceof File) || file.size === 0) return;
            upload.mutate({
              metadata: {
                clientId,
                ...(opportunityId ? { opportunityId } : {}),
                kind: String(data.get("kind")) as ClientDocumentKind,
                uploadedByEmployeeId: String(data.get("uploadedByEmployeeId")),
              },
              file,
            });
          }}
        >
          <DialogField label="Document type">
            <select required name="kind" className={dialogFieldClass}>
              {CLIENT_DOCUMENT_KINDS.map((kind) => (
                <option key={kind} value={kind}>
                  {DOCUMENT_KIND_LABELS[kind]}
                </option>
              ))}
            </select>
          </DialogField>
          <DialogField label="Uploaded by">
            <select required name="uploadedByEmployeeId" className={dialogFieldClass}>
              <option value="">Select employee</option>
              {employees.map((row) => (
                <option key={row.employee.id} value={row.employee.id}>
                  {personName(row.person)}
                </option>
              ))}
            </select>
          </DialogField>
          <DialogField label="File">
            <Input
              required
              type="file"
              name="file"
              accept="application/pdf,image/jpeg,image/png,image/webp"
            />
          </DialogField>
          {employeesQuery.error ? (
            <RequestErrorAlert
              error={presentRequestError(
                employeesQuery.error,
                "Could not load employees for this branch.",
              )}
              onRetry={() => employeesQuery.refetch()}
            />
          ) : null}
        </RecordDialog>
      ) : null}

      {deleting ? (
        <ConfirmDialog
          title={`Delete ${deleting.fileName}?`}
          description="This permanently removes the file and every version of it. This cannot be undone."
          confirmLabel="Delete document"
          onCancel={() => setDeleting(null)}
          onConfirm={() => {
            deleteDocument.mutate(deleting.id);
            setDeleting(null);
          }}
        />
      ) : null}
    </div>
  );
}
