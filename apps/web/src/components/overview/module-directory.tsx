import {
  ArrowRight,
  Building2,
  CalendarCheck2,
  ChartColumnBig,
  Laptop2,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import { type Access, type NavLabel, visibleNavItems } from "@/lib/access";

const moduleMeta: Record<NavLabel, { icon: typeof Building2; description: string; tone: string }> =
  {
    Organization: {
      icon: Building2,
      description: "Branches, working days and organization settings.",
      tone: "text-workflow bg-workflow/10",
    },
    Employees: {
      icon: UsersRound,
      description: "Employee records, departments and positions.",
      tone: "text-info bg-info/10",
    },
    Devices: {
      icon: Laptop2,
      description: "Attendance devices and employee enrolments.",
      tone: "text-warning bg-warning/12",
    },
    Attendance: {
      icon: CalendarCheck2,
      description: "Daily register and the corrections that change it.",
      tone: "text-success bg-success/10",
    },
    Reports: {
      icon: ChartColumnBig,
      description: "Lateness and absence summaries by day, week or month.",
      tone: "text-info bg-info/10",
    },
    Dashboard: {
      icon: CalendarCheck2,
      description: "Revenue, outstanding balances and conversion for the client book.",
      tone: "text-info bg-info/10",
    },
    "All clients": {
      icon: Building2,
      description: "Client relationships, owners, projects and billing.",
      tone: "text-workflow bg-workflow/10",
    },
    "Leads & pipeline": {
      icon: ArrowRight,
      description: "Commercial opportunities organized by editable sales stage.",
      tone: "text-info bg-info/10",
    },
    Contracts: {
      icon: ShieldCheck,
      description: "Commercial agreements and renewal terms.",
      tone: "text-warning bg-warning/12",
    },
    Invoices: {
      icon: CalendarCheck2,
      description: "Issued amounts, payments and outstanding balances.",
      tone: "text-success bg-success/10",
    },
  };

export function ModuleDirectory({ access, name }: { access: Access; name: string }) {
  const modules = visibleNavItems(access);

  return (
    <div className="mx-auto w-full max-w-[1240px] space-y-5">
      <header>
        <p className="text-xs font-semibold text-muted-foreground">Welcome back, {name}</p>
        <h1 className="text-strong mt-1 font-heading text-2xl font-bold tracking-[-0.03em]">
          Your workspace
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {access.role} · {modules.length} {modules.length === 1 ? "module" : "modules"} available
          to you.
        </p>
      </header>

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {modules.map((module) => {
          const meta = moduleMeta[module.label];
          const Icon = meta.icon;
          return (
            <Link
              key={module.href}
              href={module.href}
              // Every card in view would otherwise prefetch its whole module
              // page — a per-request render each — the moment Overview loads.
              prefetch={false}
              className="group flex min-h-36 flex-col rounded-[18px] bg-card p-5 text-foreground shadow-[var(--shadow-card)] ring-1 ring-border/80 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:text-foreground hover:shadow-[var(--shadow-menu)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
            >
              <div className="flex items-start justify-between">
                <span className={`grid size-9 place-items-center rounded-[11px] ${meta.tone}`}>
                  <Icon className="size-[18px]" aria-hidden="true" />
                </span>
                <ArrowRight
                  className="group-hover:text-strong size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  aria-hidden="true"
                />
              </div>
              <div className="mt-auto pt-5">
                <h2 className="text-strong font-heading text-base font-bold">{module.label}</h2>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{meta.description}</p>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
