import Link from "next/link";

import type { EmploymentContractView } from "./contract-model";
import { CONTRACT_VIEWS } from "./contract-views";

export function ContractNavigation({
  view,
  manageable,
}: {
  view: EmploymentContractView;
  manageable: boolean;
}) {
  return (
    <nav
      aria-label="Employment contract sections"
      className="flex gap-1 overflow-x-auto rounded-[14px] bg-card p-1.5 shadow-[var(--shadow-card)] ring-1 ring-border"
    >
      {CONTRACT_VIEWS.filter((item) => manageable || !item.manageableOnly).map((item) => {
        const Icon = item.icon;
        const active = item.id === view;
        return (
          <Link
            key={item.id}
            href={`/dashboard/employees?section=contracts&view=${item.id}`}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-9 shrink-0 items-center gap-2 rounded-[9px] px-3.5 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
              active
                ? "bg-primary text-primary-foreground shadow-[var(--shadow-action)]"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Icon className="size-4" aria-hidden="true" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
