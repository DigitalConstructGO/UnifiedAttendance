import type { ReactNode } from "react";

/** The white panel every tab's content sits on. */
export function TabPanel({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[18px] bg-card shadow-[var(--shadow-card)] ring-1 ring-border ${className}`}
    >
      {children}
    </section>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <div className="grid min-h-56 place-items-center px-6 py-10 text-center">
      <div className="max-w-sm">
        <span className="mx-auto grid size-11 place-items-center rounded-[13px] bg-muted text-muted-foreground">
          {icon}
        </span>
        <p className="text-strong mt-3.5 text-sm font-bold">{title}</p>
        <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{hint}</p>
      </div>
    </div>
  );
}

/**
 * Stands in for a tab whose service has not shipped. It keeps the tab in the
 * navigation and on the page so the layout is final; only the body swaps when
 * the query arrives.
 */
export function PendingTab({
  icon,
  title,
  hint,
}: {
  icon: ReactNode;
  title: string;
  hint: string;
}) {
  return (
    <TabPanel>
      <EmptyState icon={icon} title={title} hint={hint} />
    </TabPanel>
  );
}
