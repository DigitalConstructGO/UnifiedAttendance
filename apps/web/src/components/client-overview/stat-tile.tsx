import type { ReactNode } from "react";

import { TabPanel } from "../client-profile/tab-shell";

export function StatTile({
  label,
  value,
  hint,
  icon,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  icon: ReactNode;
  tone: string;
}) {
  return (
    <TabPanel className="p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-semibold text-muted-foreground">{label}</p>
        <span aria-hidden="true" className={`grid size-9 place-items-center rounded-[11px] ${tone}`}>
          {icon}
        </span>
      </div>
      <p className="text-strong mt-3 font-heading text-3xl font-bold tracking-[-0.03em]">{value}</p>
      <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p>
    </TabPanel>
  );
}
