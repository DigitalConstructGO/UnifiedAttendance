import Link from "next/link";

import { CLIENT_TAB_LABELS, CLIENT_TABS, clientTabHref, type ClientTab } from "./profile-model";

export function ProfileTabs({
  clientId,
  opportunityId,
  active,
}: {
  clientId: string;
  opportunityId?: string;
  active: ClientTab;
}) {
  return (
    <div className="relative border-t border-border">
      <nav aria-label="Client sections" className="overflow-x-auto px-2">
        <ul className="flex min-w-max items-center">
          {CLIENT_TABS.map((tab) => {
            const current = tab === active;
            return (
              <li key={tab}>
                <Link
                  href={clientTabHref(clientId, tab, opportunityId)}
                  aria-current={current ? "page" : undefined}
                  className={`inline-flex min-h-11 items-center border-b-2 px-3.5 text-xs font-semibold transition-colors ${
                    current
                      ? "text-strong border-success"
                      : "border-transparent text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {CLIENT_TAB_LABELS[tab]}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-background to-transparent sm:hidden"
      />
    </div>
  );
}
