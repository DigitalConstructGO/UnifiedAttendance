import Link from "next/link";

import { EMPLOYEE_SECTIONS } from "./navigation";
import type { EmployeeSection } from "./workspace-model";

export function EmployeeNavigation({
  section,
  manageable,
}: {
  section: EmployeeSection;
  manageable: boolean;
}) {
  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-border"
      aria-label="Employee sections"
    >
      {EMPLOYEE_SECTIONS.filter((item) => manageable || !item.requiresManage).map((item) => {
        const Icon = item.icon;
        const active = item.id === section;
        return (
          <Link
            key={item.id}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={`flex min-h-11 shrink-0 items-center gap-2 border-b-2 px-4 text-xs font-bold transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring ${
              active
                ? "text-strong border-primary"
                : "hover:text-strong border-transparent text-muted-foreground"
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
