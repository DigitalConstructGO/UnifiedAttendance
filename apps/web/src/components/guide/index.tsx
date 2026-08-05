import { BookOpen } from "lucide-react";

import { CHAPTER_COMPONENTS, CHAPTERS } from "./chapters";

/**
 * A reading surface, not a working one. It is deliberately one long page with
 * anchors rather than a wizard: somebody being onboarded reads it top to
 * bottom, and somebody who has been here a year lands on a link to one heading
 * and wants only that. Paging it would serve neither.
 *
 * Static by design — no client component, no data fetching. The guide describes
 * how the system works, which does not change while you are reading it.
 */
export function Guide() {
  return (
    <div className="mx-auto w-full max-w-[1100px]">
      <header className="border-b border-border pb-6">
        <p className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
          <BookOpen className="size-4" aria-hidden="true" />
          Guide
        </p>
        <h1 className="mt-2 font-heading text-3xl font-bold tracking-[-0.03em] text-[var(--text-strong)]">
          How this system works
        </h1>
        <p className="mt-3 max-w-[68ch] text-sm leading-7 text-muted-foreground">
          Written for somebody who has never seen it before, and does not need to know how it was
          built. Read it straight through on your first day, or jump to the part you need.
        </p>
      </header>

      <div className="grid items-start gap-10 pt-8 lg:grid-cols-[minmax(0,1fr)_15rem]">
        <div className="order-2 grid gap-10 lg:order-1">
          {CHAPTER_COMPONENTS.map((Chapter, index) => (
            <Chapter key={CHAPTERS[index]!.id} />
          ))}

          <p className="max-w-[68ch] text-xs leading-6 text-muted-foreground">
            Something here not match what you see on screen? That is a bug in the guide, not
            something you are doing wrong — tell whoever looks after the system.
          </p>
        </div>

        {/* Ordered first on small screens: a contents list is only useful before you start reading. */}
        <nav
          aria-label="Contents"
          className="order-1 lg:sticky lg:top-[86px] lg:order-2 lg:self-start"
        >
          <p className="px-3 text-[0.6875rem] font-bold tracking-[0.08em] text-muted-foreground uppercase">
            Contents
          </p>
          <ul className="mt-2 grid gap-0.5">
            {CHAPTERS.map((chapter) => {
              const Icon = chapter.icon;
              return (
                <li key={chapter.id}>
                  <a
                    href={`#${chapter.id}`}
                    className="flex min-h-10 items-center gap-2.5 rounded-[9px] px-3 text-xs font-semibold text-muted-foreground transition-colors hover:bg-[var(--surface-subtle)] hover:text-[var(--text-strong)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                  >
                    <Icon className="size-4 shrink-0" aria-hidden="true" />
                    {chapter.label}
                  </a>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </div>
  );
}
