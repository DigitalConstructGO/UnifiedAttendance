"use client";

import { PERMISSION_GROUPS } from "@UnifiedAttendance/api/rbac/permissions";
import { ChevronDown } from "lucide-react";

export const PERMISSION_MODULES = Object.entries(PERMISSION_GROUPS).map(([module, actions]) => ({
  module,
  codes: actions.map((action) => `${module}.${action}`),
}));

export function moduleLabel(module: string) {
  const label = module.replace(/_/g, " ");
  return label.charAt(0).toUpperCase() + label.slice(1);
}

function actionLabel(code: string) {
  return code.split(".")[1]?.replace(/_/g, " ") ?? code;
}

export function PermissionChecklist({
  selected,
  onToggle,
  onSetModule,
}: {
  selected: readonly string[];
  onToggle: (code: string) => void;
  onSetModule: (codes: string[], granted: boolean) => void;
}) {
  return (
    <div className="grid gap-2">
      {PERMISSION_MODULES.map(({ module, codes }) => {
        const chosen = codes.filter((code) => selected.includes(code));
        const all = chosen.length === codes.length;
        return (
          <details key={module} className="group rounded-[11px] border border-border">
            <summary className="flex cursor-pointer list-none items-center gap-3 px-4 py-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
              <span className="text-strong flex-1">{moduleLabel(module)}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                  chosen.length > 0
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                {chosen.length}/{codes.length}
              </span>
              <ChevronDown
                className="size-4 text-muted-foreground transition-transform group-open:rotate-180"
                aria-hidden="true"
              />
            </summary>
            <div className="border-t border-border px-4 py-3">
              <button
                type="button"
                className="mb-2 text-xs font-bold text-primary hover:underline"
                onClick={() => onSetModule(codes, !all)}
              >
                {all ? "Clear module" : "Select module"}
              </button>
              <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
                {codes.map((code) => (
                  <label
                    key={code}
                    className="flex items-center gap-2.5 rounded-[9px] border border-border px-3 py-2 text-xs font-semibold has-checked:border-primary/40 has-checked:bg-primary/5"
                  >
                    <input
                      type="checkbox"
                      checked={selected.includes(code)}
                      onChange={() => onToggle(code)}
                      className="size-4 accent-primary"
                    />
                    <span className="min-w-0">
                      <span className="text-strong block capitalize">{actionLabel(code)}</span>
                      <span className="block font-mono text-[0.6875rem] font-normal text-muted-foreground">
                        {code}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </details>
        );
      })}
    </div>
  );
}
