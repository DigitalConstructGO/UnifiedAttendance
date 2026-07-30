"use client";

import { usePathname } from "next/navigation";

import { ModeToggle } from "@/components/mode-toggle";
import type { Brand } from "@/lib/brand";
import { SidebarTrigger } from "@/components/ui/sidebar";

const routeTitles: Record<string, string> = {
  "/dashboard": "Overview",
  "/dashboard/organization": "Organization",
  "/dashboard/employees": "Employees",
  "/dashboard/workforce": "Employees",
  "/dashboard/devices": "Devices",
  "/dashboard/attendance": "Attendance",
  "/dashboard/corrections": "Corrections",
};

const routeContexts: Record<string, string> = {
  "/dashboard/employees": "Office / People directory",
  "/dashboard/workforce": "Office / People directory",
  "/dashboard/attendance": "Office / Daily register",
};

export function DashboardHeader({ brand }: { brand: Brand }) {
  const pathname = usePathname();
  const route = Object.keys(routeTitles)
    .sort((a, b) => b.length - a.length)
    .find((candidate) => pathname === candidate || pathname.startsWith(`${candidate}/`));
  const title = route ? routeTitles[route] : "Dashboard";
  const context = route ? (routeContexts[route] ?? `${brand.name} / Workspace`) : brand.name;

  return (
    <header className="sticky top-0 z-20 flex h-[66px] items-center gap-3 border-b bg-card/95 px-4 backdrop-blur-sm sm:px-6">
      <SidebarTrigger className="md:hidden" />
      <div className="min-w-0">
        <p className="hidden max-w-[22rem] truncate text-[0.625rem] font-bold tracking-[0.08em] text-muted-foreground uppercase sm:block">
          {context}
        </p>
        <h1 className="text-strong truncate font-heading text-lg font-bold tracking-[-0.025em]">
          {title}
        </h1>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <ModeToggle />
      </div>
    </header>
  );
}
