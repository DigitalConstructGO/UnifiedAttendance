"use client";

import {
  Building,
  Building2,
  CalendarCheck2,
  FileSignature,
  Gauge,
  Laptop2,
  LogOut,
  ReceiptText,
  ShieldCheck,
  UserRoundPlus,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { useAccess } from "@/components/access-provider";
import { BrandMark } from "@/components/brand-mark";
import type { Brand } from "@/lib/brand";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { visibleNavItems } from "@/lib/access";
import { authClient } from "@/lib/auth-client";

const moduleIcons = {
  Organization: Building2,
  Employees: UsersRound,
  Devices: Laptop2,
  Attendance: CalendarCheck2,
  Corrections: ShieldCheck,
  Clients: Building,
  "Leads & pipeline": UserRoundPlus,
  Contracts: FileSignature,
  Invoices: ReceiptText,
};

export function AppSidebar({ brand }: { brand: Brand }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, permissions } = useAccess();
  const { data: session } = authClient.useSession();
  const items = visibleNavItems({ role, permissions });
  const [signingOut, setSigningOut] = useState(false);

  async function signOut() {
    setSigningOut(true);
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push("/login");
          router.refresh();
        },
        onError: () => setSigningOut(false),
      },
    });
  }

  const initials =
    session?.user.name
      ?.split(" ")
      .map((part) => part[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "DC";

  return (
    <Sidebar collapsible="icon" className="bg-sidebar-gradient border-sidebar-border">
      <SidebarHeader className="gap-4 border-b border-sidebar-border px-3 py-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-3 px-1 text-sidebar-foreground hover:text-white"
        >
          <BrandMark
            brand={brand}
            className="size-9 rounded-[11px] shadow-[var(--shadow-action)]"
            iconClassName="size-[18px]"
          />
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block truncate font-heading text-sm font-bold tracking-[-0.02em] text-white">
              {brand.name}
            </span>
            <span className="block truncate text-[0.6875rem] text-sidebar-foreground/55">
              {brand.tagline}
            </span>
          </span>
        </Link>
        <div className="rounded-xl border border-sidebar-border bg-white/5 px-3 py-2.5 group-data-[collapsible=icon]:hidden">
          <p className="truncate text-xs font-semibold text-white">Organization workspace</p>
          <p className="mt-1 flex items-center gap-1.5 text-[0.6875rem] text-sidebar-foreground/55">
            <span className="size-1.5 rounded-full bg-primary" aria-hidden="true" />
            Permission-based access
          </p>
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 py-3">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className="px-3 text-[0.625rem] font-bold tracking-[0.1em] text-sidebar-foreground/40 uppercase">
            Workspace
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Overview"
                  isActive={pathname === "/dashboard"}
                  className="h-11 rounded-[11px] px-3 text-sidebar-foreground/75 hover:bg-white/7 hover:text-white data-[active=true]:bg-sidebar-accent data-[active=true]:text-white data-[active=true]:shadow-[inset_3px_0_0_var(--sidebar-primary)]"
                >
                  <Link href="/dashboard">
                    <Gauge aria-hidden="true" />
                    <span>Overview</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {items.map((item) => {
                const Icon = moduleIcons[item.label];
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      tooltip={item.label}
                      isActive={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                      className="h-11 rounded-[11px] px-3 text-sidebar-foreground/75 hover:bg-white/7 hover:text-white data-[active=true]:bg-sidebar-accent data-[active=true]:text-white data-[active=true]:shadow-[inset_3px_0_0_var(--sidebar-primary)]"
                    >
                      <Link href={item.href}>
                        <Icon aria-hidden="true" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2 rounded-[11px] bg-white/5 p-2 group-data-[collapsible=icon]:bg-transparent group-data-[collapsible=icon]:p-0">
          <span className="grid size-9 shrink-0 place-items-center rounded-[9px] bg-primary text-[0.6875rem] font-bold text-primary-foreground group-data-[collapsible=icon]:hidden">
            {initials}
          </span>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <p className="truncate text-xs font-semibold text-white">
              {session?.user.name || "Signed-in user"}
            </p>
            <p className="truncate text-[0.625rem] text-sidebar-foreground/50">{role}</p>
          </div>
          <button
            type="button"
            onClick={signOut}
            disabled={signingOut}
            className="grid size-9 shrink-0 place-items-center rounded-lg text-sidebar-foreground/55 transition-colors group-data-[collapsible=icon]:size-10 hover:bg-white/8 hover:text-white disabled:opacity-50"
            aria-label={signingOut ? "Signing out" : "Sign out"}
          >
            <LogOut className="size-4" aria-hidden="true" />
          </button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
