import { PencilLine } from "lucide-react";
import Link from "next/link";

import type { EmploymentContractView } from "./contract-model";
import { CONTRACT_VIEWS } from "./contract-views";

export function ContractNavigation({
  view,
  manageable,
  editingContractId,
}: {
  view: EmploymentContractView;
  manageable: boolean;
  /** When set, the create tab represents the contract being edited, not a new one. */
  editingContractId?: string;
}) {
  return (
    <nav
      aria-label="Employment contract sections"
      className="flex gap-1 overflow-x-auto rounded-[14px] bg-card p-1.5 shadow-[var(--shadow-card)] ring-1 ring-border"
    >
      {CONTRACT_VIEWS.filter((item) => manageable || !item.manageableOnly).map((item) => {
        const editing = item.id === "create" && Boolean(editingContractId);
        const Icon = editing ? PencilLine : item.icon;
        const active = item.id === view;
        return (
          <Link
            key={item.id}
            href={
              editing
                ? `/dashboard/employees?section=contracts&view=create&contractId=${editingContractId}`
                : `/dashboard/employees?section=contracts&view=${item.id}`
            }
            aria-current={active ? "page" : undefined}
            className={`flex min-h-9 shrink-0 items-center gap-2 rounded-[9px] px-3.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              active
                ? "bg-primary text-primary-foreground shadow-[var(--shadow-action)]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="size-4" aria-hidden="true" />
            {editing ? "Edit contract" : item.label}
          </Link>
        );
      })}
    </nav>
  );
}
