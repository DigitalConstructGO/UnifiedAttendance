import type { ReactNode } from "react";

export const inputClass = "h-10 rounded-[11px] px-3 font-normal";

export const selectClass =
  "h-10 rounded-[11px] border border-input bg-background px-3 text-xs font-normal";

export function Field({
  label,
  className = "",
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={`text-strong grid gap-2 text-xs font-bold ${className}`}>
      {label}
      {children}
    </label>
  );
}
