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
  "/dashboard/clients": "Client profile",
  "/dashboard/clients/pipeline": "Leads & pipeline",
  "/dashboard/clients/contracts": "Contracts",
  "/dashboard/clients/invoices": "Invoices",
  "/dashboard/clients/overview": "Client dashboard",
  "/dashboard/clients/revenue": "Revenue",
};

const routeContexts: Record<string, string> = {
  "/dashboard/employees": "Office / People directory",
  "/dashboard/workforce": "Office / People directory",
  "/dashboard/attendance": "Office / Daily register",
  "/dashboard/clients": "Clients / Customer record",
  "/dashboard/clients/pipeline": "Clients / Sales pipeline",
  "/dashboard/clients/contracts": "Clients / Agreements",
  "/dashboard/clients/invoices": "Clients / Billing",
  "/dashboard/clients/overview": "Clients / Reporting",
  "/dashboard/clients/revenue": "Clients / Reporting",
};

export function DashboardHeader({ brand }: { brand: Brand }) {
  const pathname = usePathname();
  const route = Object.keys(routeTitles)
    .sort((a, b) => b.length - a.length)
    .find((candidate) => pathname === candidate || pathname.startsWith(`${candidate}/`));
  const title = route ? routeTitles[route] : "Dashboard";
  const context = route ? (routeContexts[route] ?? `${brand.name} / Workspace`) : brand.name;

  return (
    <header className="sticky top-0 z-20 flex h-16.5 items-center gap-3 border-b bg-card/95 px-4 backdrop-blur-sm sm:px-6">
      <SidebarTrigger className="md:hidden" />
      <div className="min-w-0">
        <p className="hidden max-w-88 truncate text-[0.625rem] font-bold tracking-[0.08em] text-muted-foreground uppercase sm:block">
          {context}
        </p>
        <h1 className="text-strong truncate font-heading text-lg font-bold tracking-tight">
          {title}
        </h1>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <ModeToggle />
      </div>
    </header>
  );
}
