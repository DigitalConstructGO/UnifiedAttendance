"use client";

import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import * as React from "react";
import { DayPicker } from "react-day-picker";

import { cn } from "@/lib/utils";

/**
 * Weeks start on Monday and dates read day-first, because that is how the
 * branches this runs in write a date. `en-GB` is the same choice
 * `apps/web/src/lib/format-date.ts` makes everywhere else.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      weekStartsOn={1}
      className={cn("w-fit select-none", className)}
      classNames={{
        months: "flex flex-col gap-4",
        month: "relative flex flex-col gap-3",
        month_caption: "flex h-8 items-center justify-center px-9",
        caption_label: "text-strong font-heading text-sm font-bold",
        nav: "flex items-center justify-between absolute inset-x-0 top-0 h-8 px-0",
        button_previous:
          "grid size-8 place-items-center rounded-[9px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        button_next:
          "grid size-8 place-items-center rounded-[9px] text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        month_grid: "w-full border-collapse",
        weekdays: "flex",
        weekday: "w-9 text-[0.6875rem] font-bold text-muted-foreground",
        week: "mt-1 flex w-full",
        day: "p-0",
        day_button:
          "grid size-9 place-items-center rounded-[9px] font-heading text-xs font-semibold tabular-nums transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-ring",
        selected:
          "[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary",
        today: "[&>button]:ring-1 [&>button]:ring-ring/40",
        outside: "[&>button]:text-muted-foreground/50",
        disabled: "[&>button]:pointer-events-none [&>button]:opacity-35",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, ...iconProps }) =>
          orientation === "left" ? (
            <ChevronLeftIcon className="size-4" {...iconProps} />
          ) : (
            <ChevronRightIcon className="size-4" {...iconProps} />
          ),
      }}
      {...props}
    />
  );
}

export { Calendar };
