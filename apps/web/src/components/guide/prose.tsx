import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/**
 * Typographic pieces for the guide, which is a reading surface rather than a
 * working one. Everything here is tuned for comprehension: a 68-character
 * measure, generous leading, and headings that are anchors you can link
 * somebody to.
 *
 * `text-strong` is used as an arbitrary value rather than the utility class
 * because `--text-strong` was never mapped into `@theme inline` — the bare
 * class compiles to nothing.
 */

const STRONG = "text-[var(--text-strong)]";

export function Section({
  id,
  title,
  lead,
  children,
}: {
  id: string;
  title: string;
  lead?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-b border-border pb-10 last:border-b-0">
      <h2 className={`${STRONG} font-heading text-xl font-bold tracking-[-0.02em]`}>{title}</h2>
      {lead ? (
        <p className="mt-2 max-w-[68ch] text-sm leading-relaxed text-muted-foreground">{lead}</p>
      ) : null}
      <div className="mt-5 grid gap-4">{children}</div>
    </section>
  );
}

export function P({ children }: { children: ReactNode }) {
  return <p className="max-w-[68ch] text-sm leading-7 text-foreground">{children}</p>;
}

export function Strong({ children }: { children: ReactNode }) {
  return <strong className={`${STRONG} font-bold`}>{children}</strong>;
}

/** A term the reader will meet in the interface, so it reads the same in both places. */
export function Term({ children }: { children: ReactNode }) {
  return (
    <span
      className={`${STRONG} rounded-[6px] bg-[var(--surface-subtle)] px-1.5 py-0.5 font-semibold`}
    >
      {children}
    </span>
  );
}

export function Steps({ items }: { items: { title: string; body: string }[] }) {
  return (
    <ol className="grid gap-3">
      {items.map((item, index) => (
        <li key={item.title} className="flex gap-3.5">
          <span
            aria-hidden="true"
            className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-[9px] bg-workflow/10 font-heading text-xs font-bold text-workflow tabular-nums"
          >
            {index + 1}
          </span>
          <div className="max-w-[64ch]">
            <p className={`${STRONG} text-sm font-bold`}>{item.title}</p>
            <p className="mt-1 text-sm leading-7 text-muted-foreground">{item.body}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

export type Field = {
  label: string;
  required?: boolean;
  meaning: string;
  /** The values the field can take, when it is a fixed list rather than free text. */
  options?: string[];
};

/**
 * Fields as a table rather than prose. Somebody filling a form in front of them
 * wants to find one row, not read a paragraph — and "required" belongs in a
 * column they can scan, not buried in a sentence.
 */
export function Fields({ caption, fields }: { caption: string; fields: Field[] }) {
  return (
    <figure className="overflow-hidden rounded-[14px] ring-1 ring-border">
      <figcaption
        className={`${STRONG} border-b border-border bg-[var(--surface-subtle)] px-4 py-2.5 text-xs font-bold`}
      >
        {caption}
      </figcaption>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[34rem] border-collapse text-left">
          <thead>
            <tr className="border-b border-border text-[0.6875rem] text-muted-foreground">
              <th scope="col" className="px-4 py-2 font-bold">
                Field
              </th>
              <th scope="col" className="px-4 py-2 font-bold">
                Needed?
              </th>
              <th scope="col" className="px-4 py-2 font-bold">
                What it is for
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {fields.map((field) => (
              <tr key={field.label} className="align-top">
                <th
                  scope="row"
                  className={`${STRONG} px-4 py-3 text-xs font-bold whitespace-nowrap`}
                >
                  {field.label}
                </th>
                <td className="px-4 py-3 text-xs">
                  {field.required ? (
                    <span className="font-semibold text-destructive">Required</span>
                  ) : (
                    <span className="text-muted-foreground">Optional</span>
                  )}
                </td>
                <td className="px-4 py-3 text-xs leading-6 text-muted-foreground">
                  {field.meaning}
                  {field.options ? (
                    <span className="mt-1.5 flex flex-wrap gap-1">
                      {field.options.map((option) => (
                        <span
                          key={option}
                          className={`${STRONG} rounded-[6px] bg-[var(--surface-subtle)] px-1.5 py-0.5 text-[0.6875rem] font-semibold`}
                        >
                          {option}
                        </span>
                      ))}
                    </span>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

/**
 * Label and meaning, with no "required" column — for lists that are choices
 * rather than form fields. Correction kinds and roles are not things you fill
 * in, so asking whether they are required would be answering a question nobody
 * asked.
 */
export function Defs({
  caption,
  items,
}: {
  caption: string;
  items: { label: string; meaning: string }[];
}) {
  return (
    <div className="overflow-hidden rounded-[14px] ring-1 ring-border">
      <p
        className={`${STRONG} border-b border-border bg-[var(--surface-subtle)] px-4 py-2.5 text-xs font-bold`}
      >
        {caption}
      </p>
      <dl className="divide-y divide-border">
        {items.map((item) => (
          <div key={item.label} className="grid gap-1 px-4 py-3 sm:grid-cols-[13rem_1fr] sm:gap-4">
            <dt className={`${STRONG} text-xs font-bold`}>{item.label}</dt>
            <dd className="max-w-[58ch] text-xs leading-6 text-muted-foreground">{item.meaning}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

/** The one thing on a page somebody will regret not having read. */
export function Note({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon;
  title: string;
  children: ReactNode;
}) {
  return (
    <aside className="flex max-w-[68ch] gap-3 rounded-[14px] bg-warning/8 p-4 ring-1 ring-warning/20">
      <Icon className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden="true" />
      <div>
        <p className={`${STRONG} text-xs font-bold`}>{title}</p>
        <p className="mt-1 text-xs leading-6 text-foreground">{children}</p>
      </div>
    </aside>
  );
}
