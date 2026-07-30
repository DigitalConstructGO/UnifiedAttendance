"use client";

import { Building2, X } from "lucide-react";
import { useEffect, useRef } from "react";

import { RequestErrorAlert } from "@/components/request-error-alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { Branch, ClientType, EmployeeRow, Industry } from "@/lib/api";
import { personName } from "@/lib/client-presentation";
import type { RequestErrorPresentation } from "@/lib/errors";

const fieldClass =
  "h-10 w-full rounded-[11px] border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-1 focus-visible:ring-ring/50";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="text-strong grid gap-1.5 text-xs font-bold">
      {label}
      {children}
    </label>
  );
}

/**
 * The create form is deliberately the minimum valid client: everything else —
 * company size, priority, tax identifiers, contacts — is added from the profile,
 * so nothing here invents a value the user did not supply.
 */
export function AddClientDialog({
  branches,
  industries,
  clientTypes,
  employees,
  busy,
  error,
  onSubmit,
  onClose,
}: {
  branches: Branch[];
  industries: Industry[];
  clientTypes: ClientType[];
  employees: EmployeeRow[];
  busy: boolean;
  error: RequestErrorPresentation | null;
  onSubmit: (form: HTMLFormElement) => void;
  onClose: () => void;
}) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dialogRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[oklch(0.2_0.05_265/0.55)] p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-client-title"
        tabIndex={-1}
        className="w-full max-w-xl rounded-[18px] bg-card shadow-[var(--shadow-card)] ring-1 ring-border outline-none"
      >
        <header className="flex items-start justify-between gap-3 border-b border-border px-6 py-5">
          <div className="flex items-start gap-3">
            <span
              aria-hidden="true"
              className="grid size-10 place-items-center rounded-[11px] bg-success/10 text-success"
            >
              <Building2 className="size-5" />
            </span>
            <div>
              <h2 id="add-client-title" className="text-strong font-heading text-base font-bold">
                Add client
              </h2>
              <p className="mt-0.5 text-xs text-muted-foreground">
                A permanent client ID is assigned automatically
              </p>
            </div>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Close"
            onClick={onClose}
            className="size-9 rounded-full"
          >
            <X aria-hidden="true" />
          </Button>
        </header>

        <form
          className="grid gap-4 px-6 py-5"
          onSubmit={(event) => {
            event.preventDefault();
            onSubmit(event.currentTarget);
          }}
        >
          <Field label="Company / client name">
            <Input required name="legalName" placeholder="e.g. Awash Insurance S.C." />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Industry">
              <select required name="industryId" className={fieldClass}>
                {industries.map((industry) => (
                  <option key={industry.id} value={industry.id}>
                    {industry.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Client type">
              <select required name="clientTypeId" className={fieldClass}>
                {clientTypes.map((clientType) => (
                  <option key={clientType.id} value={clientType.id}>
                    {clientType.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Account owner">
              <select required name="ownerEmployeeId" className={fieldClass}>
                {employees.map((row) => (
                  <option key={row.employee.id} value={row.employee.id}>
                    {personName(row.person)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Branch">
              <select required name="branchId" className={fieldClass}>
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Phone">
              <Input name="phone" placeholder="+251" />
            </Field>
            <Field label="Email">
              <Input name="email" type="email" placeholder="name@company.et" />
            </Field>
          </div>

          {error ? <RequestErrorAlert error={error} focusOnError /> : null}

          <div className="mt-1 flex flex-wrap justify-end gap-3 border-t border-border pt-5">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-[11px] px-5"
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button disabled={busy} className="h-10 rounded-[11px] px-5 font-bold">
              {busy ? "Creating…" : "Create client"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
