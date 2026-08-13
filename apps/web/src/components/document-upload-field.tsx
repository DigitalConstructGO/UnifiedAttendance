"use client";

import { AlertCircle, CheckCircle2, ExternalLink, FileText, FileUp } from "lucide-react";
import { useEffect, useRef, useState } from "react";

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
  current?: { url: string; contentType: string } | null;
  upload?: UploadFieldStatus | null;
}) {
  const [selected, setSelected] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const previewUrl = useRef<string | null>(null);

  function choose(file: File | null) {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = file && file.type !== "application/pdf" ? URL.createObjectURL(file) : null;
    setPreview(previewUrl.current);
    setSelected(file);
  }

  useEffect(
    () => () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    },
    [],
  );

  const currentIsImage = current ? current.contentType !== "application/pdf" : false;

  return (
    <label className="group grid min-h-24 cursor-pointer content-start gap-1.5 rounded-[12px] border border-dashed border-input bg-[var(--surface-subtle)] px-4 py-3 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 hover:border-primary/50 hover:bg-primary/[0.03]">
      <span className="text-strong flex items-center gap-2 text-xs font-bold">
        <FileUp className="size-4 text-info" aria-hidden="true" />
        {label}
      </span>
      <span className="text-[0.6875rem] leading-relaxed text-muted-foreground">{hint}</span>
      <input
        type="file"
        name={name}
        accept={
          imagesOnly
            ? "image/jpeg,image/png,image/webp"
            : "image/jpeg,image/png,image/webp,application/pdf"
        }
        onChange={(event) => choose(event.target.files?.[0] ?? null)}
        className="mt-1 block w-full text-[0.6875rem] text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-2.5 file:py-1.5 file:text-[0.6875rem] file:font-bold file:text-primary hover:file:bg-primary/15"
      />

      {selected ? (
        <span className="mt-1 flex items-center gap-2">
          {preview ? (
            <img
              src={preview}
              alt=""
              className="size-9 shrink-0 rounded-[8px] object-cover ring-1 ring-border"
            />
          ) : (
            <span className="grid size-9 shrink-0 place-items-center rounded-[8px] bg-muted text-muted-foreground">
              <FileText className="size-4" aria-hidden="true" />
            </span>
          )}
          <span className="min-w-0 text-[0.6875rem] leading-tight text-muted-foreground">
            <span className="text-strong block truncate font-semibold">{selected.name}</span>
            {formatBytes(selected.size)}
            {!upload ? " — uploads when you save" : null}
          </span>
        </span>
      ) : null}

      {upload?.state === "uploading" ? (
        <span className="mt-1 grid gap-1">
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
        <span className="mt-1 flex items-center gap-1.5 text-[0.6875rem] font-semibold text-success">
          <CheckCircle2 className="size-3.5 shrink-0" aria-hidden="true" />
          Uploaded {upload.fileName}
        </span>
      ) : null}
      {upload?.state === "failed" ? (
        <span className="mt-1 flex items-start gap-1.5 text-[0.6875rem] font-semibold text-destructive">
          <AlertCircle className="mt-px size-3.5 shrink-0" aria-hidden="true" />
          <span>
            {upload.fileName} failed{upload.reason ? ` — ${upload.reason}` : ""}
          </span>
        </span>
      ) : null}

      {current && !selected && upload?.state !== "done" ? (
        <span className="mt-1 flex items-center justify-between gap-2 border-t border-border/70 pt-2">
          <span className="flex min-w-0 items-center gap-2">
            {currentIsImage ? (
              <img
                src={current.url}
                alt=""
                className="size-9 shrink-0 rounded-[8px] object-cover ring-1 ring-border"
              />
            ) : (
              <span className="grid size-9 shrink-0 place-items-center rounded-[8px] bg-muted text-muted-foreground">
                <FileText className="size-4" aria-hidden="true" />
              </span>
            )}
            <span className="text-[0.6875rem] font-semibold text-muted-foreground">On file</span>
          </span>
          <a
            href={current.url}
            target="_blank"
            rel="noreferrer"
            onClick={(event) => event.stopPropagation()}
            className="flex shrink-0 items-center gap-1 text-[0.6875rem] font-bold text-primary hover:underline"
          >
            <ExternalLink className="size-3.5" aria-hidden="true" />
            View
          </a>
        </span>
      ) : null}
    </label>
  );
}
