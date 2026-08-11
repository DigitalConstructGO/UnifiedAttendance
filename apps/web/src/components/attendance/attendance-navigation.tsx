"use client";

import Link from "next/link";

import { useAccess } from "@/components/access-provider";

import { ATTENDANCE_SECTIONS } from "./navigation";
import type { AttendanceSection } from "./navigation";

export function AttendanceNavigation({ section }: { section: AttendanceSection }) {
  const { can } = useAccess();
  const visible = ATTENDANCE_SECTIONS.filter((item) => can(item.permission));

  if (visible.length < 2) return null;

  return (
    <nav
      className="flex gap-1 overflow-x-auto border-b border-border"
      aria-label="Attendance sections"
    >
      {visible.map((item) => {
        const Icon = item.icon;
        const active = item.id === section;
        return (
          <Link
            key={item.id}
            href={item.href}
            prefetch={false}
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
