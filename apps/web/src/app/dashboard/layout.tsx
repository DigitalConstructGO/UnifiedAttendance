import { redirect } from "next/navigation";

import { AccessProvider } from "@/components/access-provider";
import { AppSidebar } from "@/components/app-sidebar";
import { DashboardHeader } from "@/components/dashboard-header";
import { getBrand } from "@/lib/brand";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { loadAccess } from "@/lib/access-server";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [{ access }, brand] = await Promise.all([loadAccess(), getBrand()]);

  // No Role means nothing in here is usable, so never render the shell around it.
  if (!access.role) redirect("/no-access");

  return (
    <AccessProvider access={access}>
      <TooltipProvider>
        <SidebarProvider style={{ "--sidebar-width": "16.5rem" } as React.CSSProperties}>
          <AppSidebar brand={brand} />
          <SidebarInset>
            <DashboardHeader brand={brand} />
            <main className="flex-1 px-4 py-5 sm:px-6 lg:px-7 lg:py-7">{children}</main>
          </SidebarInset>
        </SidebarProvider>
      </TooltipProvider>
    </AccessProvider>
  );
}
