"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";

import { DocumentUploadField } from "@/components/document-upload-field";
import { Button } from "@/components/ui/button";
import { Card, CardAction, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { workforceQueries, type Cosigner } from "@/lib/api";

import type { UploadStatusMap } from "./uploads";

const DOCUMENT_FIELDS = [
  { name: "cosignerNationalIdFront", label: "National ID — front", kind: "national_id_front" },
  { name: "cosignerNationalIdBack", label: "National ID — back", kind: "national_id_back" },
  { name: "cosignerWorkplaceIdFront", label: "Workplace ID — front", kind: "workplace_id_front" },
  { name: "cosignerWorkplaceIdBack", label: "Workplace ID — back", kind: "workplace_id_back" },
] as const;

export function CosignerEditForm({
  editing,
  busy,
  uploadProgress,
  uploadStates,
  onSubmit,
  onCancel,
}: {
  editing: Cosigner;
  busy: boolean;
  uploadProgress: string | null;
  uploadStates: UploadStatusMap;
  onSubmit: (form: HTMLFormElement) => void;
  onCancel: () => void;
}) {
  const documents = useQuery(workforceQueries.documents({ cosignerId: editing.id }));
  const fullNameRef = useRef<HTMLInputElement>(null);

  // The form mounts above the table when a row's Edit is pressed; moving focus
  // into it is what tells keyboard and screen-reader users where they landed.
  useEffect(() => {
    fullNameRef.current?.focus();
  }, [editing.id]);

  return (
    <Card className="gap-0 rounded-[18px] py-0 shadow-[var(--shadow-card)] ring-border">
      <CardHeader className="border-b border-border px-5 py-4">
        <CardTitle className="text-sm font-bold">Edit {editing.fullName}</CardTitle>
        <p className="text-xs text-muted-foreground">
          Update the directory record or upload replacement private identity files.
        </p>
        <CardAction>
          <span
            role="status"
            className="rounded-md bg-primary/10 px-2.5 py-1 text-[0.6875rem] font-bold text-primary"
          >
            Editing
          </span>
        </CardAction>
      </CardHeader>
      <CardContent className="p-5">
        <form
          className="space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(event.currentTarget);
          }}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <Input
              ref={fullNameRef}
              required
              name="fullName"
              defaultValue={editing.fullName}
              aria-label="Full name"
              key={`${editing.id}-fullName`}
            />
            <Input
              required
              name="phone"
              defaultValue={editing.phone ?? ""}
              aria-label="Phone"
              key={`${editing.id}-phone`}
            />
            <Input
              required
              name="workplace"
              defaultValue={editing.workplace ?? ""}
              aria-label="Workplace"
              key={`${editing.id}-workplace`}
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {DOCUMENT_FIELDS.map((field) => {
              const row = documents.data?.find((entry) => entry.document.kind === field.kind);
              return (
                <DocumentUploadField
                  key={field.name}
                  name={field.name}
                  label={field.label}
                  hint="Image or PDF"
                  current={
                    row
                      ? {
                          id: row.document.id,
                          url: row.downloadUrl,
                          contentType: row.document.contentType,
                        }
                      : null
                  }
                  upload={uploadStates[field.name] ?? null}
                />
              );
            })}
          </div>
          <div className="flex gap-2">
            <Button disabled={busy}>
              {busy ? (uploadProgress ?? "Saving…") : "Save cosigner"}
            </Button>
            <Button type="button" variant="ghost" disabled={busy} onClick={onCancel}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
