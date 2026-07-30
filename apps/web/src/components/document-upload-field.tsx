"use client";

import { FileUp } from "lucide-react";

export function DocumentUploadField({
  name,
  label,
  hint,
  imagesOnly = false,
}: {
  name: string;
  label: string;
  hint: string;
  imagesOnly?: boolean;
}) {
  return (
    <label className="group grid min-h-24 cursor-pointer content-center gap-1.5 rounded-[12px] border border-dashed border-input bg-[var(--surface-subtle)] px-4 py-3 transition-colors focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20 hover:border-primary/50 hover:bg-primary/[0.03]">
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
        className="mt-1 block w-full text-[0.6875rem] text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/10 file:px-2.5 file:py-1.5 file:text-[0.6875rem] file:font-bold file:text-primary hover:file:bg-primary/15"
      />
    </label>
  );
}
