"use client";

import {
  BellRing,
  Building,
  Building2,
  CalendarCheck2,
  ChartColumnBig,
  FileSignature,
  Gauge,
  Laptop2,
  LogOut,
  type LucideIcon,
  PieChart,
  ReceiptText,
  TrendingUp,
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
import { DASHBOARD_NAV, type NavLabel, visibleNavSections } from "@/lib/access";
import { authClient } from "@/lib/auth-client";

const moduleIcons = {
  Organization: Building2,
  Employees: UsersRound,
  Devices: Laptop2,
  Attendance: CalendarCheck2,
  Reports: ChartColumnBig,
  Dashboard: PieChart,
  "All clients": Building,
  "Leads & pipeline": UserRoundPlus,
  Contracts: FileSignature,
  Invoices: ReceiptText,
  Revenue: TrendingUp,
  "Users & access": ShieldCheck,
  Notifications: BellRing,
} satisfies Record<NavLabel, LucideIcon>;

const groupLabelClass =
  "px-3 text-[0.625rem] font-bold tracking-[0.1em] text-sidebar-foreground/40 uppercase";

const menuButtonClass =
  "h-11 rounded-[11px] px-3 text-sidebar-foreground/75 hover:bg-white/7 hover:text-white data-[active=true]:bg-sidebar-accent data-[active=true]:text-white data-[active=true]:shadow-[inset_3px_0_0_var(--sidebar-primary)]";

function isCurrent(pathname: string, href: string) {
  if (pathname === href) return true;
  if (!pathname.startsWith(`${href}/`)) return false;
  return !DASHBOARD_NAV.some(
    (other) =>
      other.href.length > href.length &&
      (pathname === other.href || pathname.startsWith(`${other.href}/`)),
  );
}

export function AppSidebar({ brand }: { brand: Brand }) {
  const pathname = usePathname();
  const router = useRouter();
  const { role, permissions } = useAccess();
  const { data: session } = authClient.useSession();
  const sections = visibleNavSections({ role, permissions });
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
      .toUpperCase() || "UA";

  return (
    <Sidebar collapsible="icon" className="bg-sidebar-gradient border-sidebar-border">
      <SidebarHeader className="gap-4 border-b border-sidebar-border px-3 py-4">
        <Link
          href="/dashboard"
          prefetch={false}
          className="flex items-center gap-3 px-1 text-sidebar-foreground hover:text-white"
        >
          <BrandMark
            brand={brand}
            className="size-9 rounded-[11px] shadow-(--shadow-action)"
            iconClassName="size-4.5"
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
      </SidebarHeader>

      <SidebarContent className="gap-4 px-2 py-3">
        <SidebarGroup className="p-0">
          <SidebarGroupLabel className={groupLabelClass}>Main</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="gap-1">
              <SidebarMenuItem>
                <SidebarMenuButton
                  asChild
                  tooltip="Overview"
                  isActive={pathname === "/dashboard"}
                  className={menuButtonClass}
                >
                  <Link href="/dashboard" prefetch={false}>
                    <Gauge aria-hidden="true" />
                    <span>Overview</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {sections.map((section) => (
          <SidebarGroup key={section.label} className="p-0">
            <SidebarGroupLabel className={groupLabelClass}>{section.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-1">
                {section.items.map((item) => {
                  const Icon = moduleIcons[item.label];
                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        asChild
                        tooltip={item.label}
                        isActive={isCurrent(pathname, item.href)}
                        className={menuButtonClass}
                      >
                        <Link href={item.href} prefetch={false}>
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
        ))}
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
