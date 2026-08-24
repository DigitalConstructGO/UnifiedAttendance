"use client";

import { Building2, ImagePlus, Save, Trash2 } from "lucide-react";
import { useRef } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const LOGO_ACCEPT = "image/png,image/jpeg,image/webp,image/svg+xml";
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

type Props = {
  name: string;
  code: string;
  timezone: string;
  tin: string;
  address: string;
  busy: boolean;
  onNameChange: (value: string) => void;
  onCodeChange: (value: string) => void;
  onTimezoneChange: (value: string) => void;
  onTinChange: (value: string) => void;
  onAddressChange: (value: string) => void;
  onSave: () => void;
  logoUrl: string | null;
  /** 0..1 while an upload is in flight, otherwise null. */
  logoProgress: number | null;
  onLogoUpload: (file: File) => void;
  onLogoRemove: () => void;
};

export function OverviewTab({
  name,
  code,
  timezone,
  tin,
  address,
  busy,
  onNameChange,
  onCodeChange,
  onTimezoneChange,
  onTinChange,
  onAddressChange,
  onSave,
  logoUrl,
  logoProgress,
  onLogoUpload,
  onLogoRemove,
}: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const uploading = logoProgress !== null;

  function chooseLogo(file: File | undefined) {
    if (!file) return;
    if (file.size > LOGO_MAX_BYTES) {
      window.alert("The logo must be 2 MB or smaller.");
      return;
    }
    onLogoUpload(file);
  }

  return (
    <section className="rounded-[18px] bg-card p-6 shadow-[var(--shadow-card)] ring-1 ring-border">
      <div className="mb-6 flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-[11px] bg-workflow/10 text-workflow">
          <Building2 className="size-5" />
        </span>
        <div>
          <h2 className="text-strong font-heading font-bold">Organization details</h2>
          <p className="text-xs text-muted-foreground">
            The timezone controls branch schedules and attendance calculations.
          </p>
        </div>
      </div>
      <div className="mb-6 flex flex-wrap items-center gap-4 rounded-[14px] bg-muted/40 p-4 ring-1 ring-border">
        <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-[11px] bg-primary text-primary-foreground">
          {logoUrl ? (
            <img src={logoUrl} alt="Organization logo" className="size-full object-cover" />
          ) : (
            <Building2 className="size-7" aria-hidden="true" />
          )}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-strong text-sm font-bold">Logo</p>
          <p className="text-xs text-muted-foreground">
            Shown on the login page, in the sidebar and on invoices. PNG, JPEG, WebP or SVG, up to 2
            MB; a square image works best.
          </p>
          {uploading ? (
            <div
              className="mt-2 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(logoProgress * 100)}
            >
              <div
                className="h-full bg-primary transition-[width]"
                style={{ width: `${Math.round(logoProgress * 100)}%` }}
              />
            </div>
          ) : null}
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInput}
            type="file"
            accept={LOGO_ACCEPT}
            className="sr-only"
            onChange={(event) => {
              chooseLogo(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            variant="outline"
            className="h-9 rounded-[11px] font-bold"
            disabled={busy || uploading}
            onClick={() => fileInput.current?.click()}
          >
            <ImagePlus className="size-4" />
            {logoUrl ? "Replace logo" : "Upload logo"}
          </Button>
          {logoUrl ? (
            <Button
              type="button"
              variant="ghost"
              className="h-9 rounded-[11px] font-bold text-destructive"
              disabled={busy || uploading}
              onClick={onLogoRemove}
            >
              <Trash2 className="size-4" />
              Remove
            </Button>
          ) : null}
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="text-strong space-y-2 text-xs font-bold">
          Name
          <Input value={name} onChange={(event) => onNameChange(event.target.value)} />
        </label>
        <label className="text-strong space-y-2 text-xs font-bold">
          Code
          <Input
            pattern="[A-Za-z0-9-]{2,20}"
            value={code}
            onChange={(event) => onCodeChange(event.target.value)}
          />
        </label>
        <label className="text-strong space-y-2 text-xs font-bold sm:col-span-2">
          Timezone
          <Input
            required
            value={timezone}
            onChange={(event) => onTimezoneChange(event.target.value)}
            placeholder="e.g. Africa/Addis_Ababa"
          />
        </label>
        <label className="text-strong space-y-2 text-xs font-bold">
          TIN
          <Input
            value={tin}
            onChange={(event) => onTinChange(event.target.value)}
            placeholder="Printed on invoices"
          />
        </label>
        <label className="text-strong space-y-2 text-xs font-bold">
          Address
          <Input
            value={address}
            onChange={(event) => onAddressChange(event.target.value)}
            placeholder="Printed on invoices"
          />
        </label>
      </div>
      <Button className="mt-5 h-10 rounded-[11px] font-bold" onClick={onSave} disabled={busy}>
        <Save className="size-4" />
        Save details
      </Button>
    </section>
  );
}
