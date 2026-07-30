import { DocumentUploadField } from "@/components/document-upload-field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { Cosigner } from "@/lib/api";

const DOCUMENT_FIELDS = [
  { name: "cosignerNationalIdFront", label: "National ID — front" },
  { name: "cosignerNationalIdBack", label: "National ID — back" },
  { name: "cosignerWorkplaceIdFront", label: "Workplace ID — front" },
  { name: "cosignerWorkplaceIdBack", label: "Workplace ID — back" },
] as const;

export function CosignerEditForm({
  editing,
  busy,
  uploadProgress,
  onSubmit,
  onCancel,
}: {
  editing: Cosigner;
  busy: boolean;
  uploadProgress: string | null;
  onSubmit: (form: HTMLFormElement) => void;
  onCancel: () => void;
}) {
  return (
    <Card className="gap-0 rounded-[18px] py-0 shadow-[var(--shadow-card)] ring-border">
      <CardHeader className="border-b border-border px-5 py-4">
        <CardTitle className="text-sm font-bold">Edit {editing.fullName}</CardTitle>
        <p className="text-xs text-muted-foreground">
          Update the directory record or upload replacement private identity files.
        </p>
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
              required
              name="fullName"
              defaultValue={editing.fullName}
              aria-label="Full name"
            />
            <Input required name="phone" defaultValue={editing.phone ?? ""} aria-label="Phone" />
            <Input
              required
              name="workplace"
              defaultValue={editing.workplace ?? ""}
              aria-label="Workplace"
            />
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {DOCUMENT_FIELDS.map((field) => (
              <DocumentUploadField
                key={field.name}
                name={field.name}
                label={field.label}
                hint="Image or PDF"
              />
            ))}
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
