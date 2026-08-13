"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  CheckCircle2,
  Expand,
  FileText,
  FileUp,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { useAccess } from "@/components/access-provider";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { workforceApi, workforceKeys } from "@/lib/api";

/** Live status one upload slot receives while the surrounding form saves. */
export type UploadFieldStatus = {
  fileName: string;
  percent: number;
  state: "uploading" | "done" | "failed";
  reason?: string;
};

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function PreviewDialog({
  title,
  url,
  contentType,
  onClose,
}: {
  title: string;
  url: string;
  contentType: string;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialogRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  const isPdf = contentType === "application/pdf";

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[oklch(0.2_0.05_265/0.7)] p-4"
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        onClick={(event) => event.stopPropagation()}
        className="grid w-full max-w-3xl content-start gap-3 rounded-[18px] bg-card p-4 shadow-[var(--shadow-card)] ring-1 ring-border outline-none"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="text-strong text-sm font-bold">{title}</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-[9px] font-bold"
            onClick={onClose}
          >
            <X aria-hidden="true" />
            Close
          </Button>
        </div>
        {isPdf ? (
          <iframe
            src={url}
            title={title}
            className="h-[75vh] w-full rounded-[11px] bg-muted ring-1 ring-border"
          />
        ) : (
          <img
            src={url}
            alt={title}
            className="max-h-[75vh] w-full rounded-[11px] bg-muted object-contain"
          />
        )}
      </div>
    </div>
  );
}

export function DocumentUploadField({
  name,
  label,
  hint,
  imagesOnly = false,
  current = null,
  upload = null,
}: {
  name: string;
  label: string;
  hint: string;
  imagesOnly?: boolean;
  /** The finalized file already on record for this slot, if any. */
  current?: { id: string; url: string; contentType: string } | null;
  upload?: UploadFieldStatus | null;
}) {
  const { can } = useAccess();
  const manageable = can("workforce_documents.manage");
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = useRef<string | null>(null);
  const [selected, setSelected] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [viewing, setViewing] = useState(false);
  const [confirmingRemove, setConfirmingRemove] = useState(false);

  function choose(file: File | null) {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = file ? URL.createObjectURL(file) : null;
    setPreview(previewUrl.current);
    setSelected(file);
  }

  useEffect(
    () => () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    },
    [],
  );

  const remove = useMutation({
    mutationFn: () => workforceApi.deleteDocument(current!.id),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: workforceKeys.documentsAll }),
        queryClient.invalidateQueries({ queryKey: workforceKeys.employeesAll }),
      ]);
    },
  });

  // What the media zone shows: this save's pick beats the file on record.
  const media = selected
    ? { url: preview, contentType: selected.type }
    : current
      ? { url: current.url, contentType: current.contentType }
      : null;
  const mediaIsImage = media ? media.contentType !== "application/pdf" : false;

  return (
    <div className="grid content-start gap-2 rounded-[12px] border border-input bg-[var(--surface-subtle)] p-3 transition-colors focus-within:border-ring hover:border-primary/40">
      <span className="text-strong flex items-center gap-2 text-xs font-bold">
        <FileUp className="size-4 text-info" aria-hidden="true" />
        {label}
      </span>

      <button
        type="button"
        onClick={() => (media ? setViewing(true) : inputRef.current?.click())}
        className="group relative block aspect-[4/3] w-full overflow-hidden rounded-[9px] ring-1 ring-border focus-visible:ring-2 focus-visible:ring-ring"
        aria-label={media ? `Preview ${label}` : `Choose a file for ${label}`}
      >
        {media && mediaIsImage && media.url ? (
          <img src={media.url} alt="" className="size-full object-cover" />
        ) : media ? (
          <span className="grid size-full place-items-center bg-muted text-muted-foreground">
            <span className="grid justify-items-center gap-1">
              <FileText className="size-8" aria-hidden="true" />
              <span className="text-[0.6875rem] font-bold">PDF document</span>
            </span>
          </span>
        ) : (
          <span className="grid size-full place-items-center border border-dashed border-input bg-background/60 text-muted-foreground transition-colors group-hover:border-primary/50 group-hover:text-primary">
            <span className="grid justify-items-center gap-1 px-3">
              <Upload className="size-6" aria-hidden="true" />
              <span className="text-[0.6875rem] font-bold">Browse files</span>
              <span className="text-[0.6875rem] leading-tight font-normal">{hint}</span>
            </span>
          </span>
        )}
        {media ? (
          <span className="absolute right-1.5 bottom-1.5 grid size-7 place-items-center rounded-[8px] bg-[oklch(0.2_0.05_265/0.55)] text-white opacity-80 transition-opacity group-hover:opacity-100">
            <Expand className="size-3.5" aria-hidden="true" />
          </span>
        ) : null}
      </button>

      {selected ? (
        <p className="min-w-0 text-[0.6875rem] leading-tight text-muted-foreground">
          <span className="text-strong block truncate font-semibold">{selected.name}</span>
          {formatBytes(selected.size)}
          {!upload ? " — uploads when you save" : null}
        </p>
      ) : current ? (
        <p className="text-[0.6875rem] text-muted-foreground">On file — tap the card to preview.</p>
      ) : null}

      {upload?.state === "uploading" ? (
        <span className="grid gap-1">
          <span className="h-1.5 overflow-hidden rounded-full bg-muted">
            <span
              className="block h-full rounded-full bg-primary transition-[width] duration-300"
              style={{ width: `${upload.percent}%` }}
            />
          </span>
          <span className="text-[0.6875rem] font-semibold text-muted-foreground">
            Uploading {upload.fileName}… {upload.percent}%
          </span>
        </span>
      ) : null}
      {upload?.state === "done" ? (
        <span className="flex items-center gap-1.5 text-[0.6875rem] font-semibold text-success">
          <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
          Uploaded {upload.fileName}
        </span>
      ) : null}
      {upload?.state === "failed" ? (
        <span className="flex items-start gap-1.5 text-[0.6875rem] font-semibold text-destructive">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          <span>
            {upload.fileName} failed{upload.reason ? ` — ${upload.reason}` : ""}
          </span>
        </span>
      ) : null}
      {remove.error ? (
        <span className="flex items-start gap-1.5 text-[0.6875rem] font-semibold text-destructive">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          Could not remove the file. Try again.
        </span>
      ) : null}

      <input
        ref={inputRef}
        type="file"
        name={name}
        accept={
          imagesOnly
            ? "image/jpeg,image/png,image/webp"
            : "image/jpeg,image/png,image/webp,application/pdf"
        }
        onChange={(event) => choose(event.target.files?.[0] ?? null)}
        className="sr-only"
        tabIndex={-1}
      />
      <div className="flex flex-wrap items-center gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8 rounded-[9px] font-bold"
          onClick={() => inputRef.current?.click()}
        >
          <Upload aria-hidden="true" />
          {current || selected ? "Upload again" : "Browse"}
        </Button>
        {current && manageable ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 rounded-[9px] font-bold text-destructive hover:bg-destructive/10 hover:text-destructive"
            disabled={remove.isPending}
            onClick={() => setConfirmingRemove(true)}
          >
            <Trash2 aria-hidden="true" />
            {remove.isPending ? "Removing…" : "Remove"}
          </Button>
        ) : null}
      </div>

      {viewing && media?.url ? (
        <PreviewDialog
          title={label}
          url={media.url}
          contentType={media.contentType}
          onClose={() => setViewing(false)}
        />
      ) : null}
      {confirmingRemove && current ? (
        <ConfirmDialog
          title={`Remove ${label.toLowerCase()}?`}
          description="The file is deleted from private storage. You can upload a new one any time."
          confirmLabel="Remove file"
          onCancel={() => setConfirmingRemove(false)}
          onConfirm={() => {
            setConfirmingRemove(false);
            remove.mutate();
          }}
        />
      ) : null}
    </div>
  );
}
