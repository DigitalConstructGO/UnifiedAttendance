import {
  ArrowRight,
  Building2,
  CalendarCheck2,
  CheckCircle2,
  Fingerprint,
  Laptop2,
  ShieldCheck,
  UsersRound,
} from "lucide-react";
import Link from "next/link";

import { visibleNavItems } from "@/lib/access";
import { loadAccess } from "@/lib/access-server";

const moduleMeta = {
  Organization: { icon: Building2, description: "Branches, working days and organization settings.", tone: "text-workflow bg-workflow/10" },
  Workforce: { icon: UsersRound, description: "Employees, departments and workforce records.", tone: "text-info bg-info/10" },
  Devices: { icon: Laptop2, description: "Attendance devices and employee enrolments.", tone: "text-warning bg-warning/12" },
  Attendance: { icon: CalendarCheck2, description: "Daily records and derived attendance days.", tone: "text-success bg-success/10" },
  Corrections: { icon: ShieldCheck, description: "Review and manage attendance corrections.", tone: "text-destructive bg-destructive/8" },
};

export default async function DashboardPage() {
  const { session, access } = await loadAccess();
  const modules = visibleNavItems(access);
  const firstName = session.user.name?.split(" ")[0] || "there";
  const setupSteps = modules.slice(0, 3);

  return (
    <div className="mx-auto w-full max-w-[1240px] space-y-6">
      <section className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold text-muted-foreground">Welcome back, {firstName}</p>
          <h2 className="font-heading mt-1 text-2xl font-bold tracking-[-0.03em] text-strong">Your operations workspace</h2>
        </div>
        <p className="text-xs text-muted-foreground">Access reflects your assigned role and permissions.</p>
      </section>

      <section aria-labelledby="access-summary-title">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-[9px] bg-workflow/10 px-3 py-2 text-[0.6875rem] font-bold tracking-[0.06em] text-workflow uppercase">
            <Fingerprint className="size-4" aria-hidden="true" />Access summary
          </div>
          <div className="h-px flex-1 bg-border" />
        </div>
        <h3 id="access-summary-title" className="sr-only">Access summary</h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[18px] bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-border/80">
            <p className="text-xs font-semibold text-muted-foreground">Available modules</p>
            <div className="mt-5 flex items-end justify-between">
              <p className="font-numeric text-3xl font-bold text-strong">{modules.length}</p>
              <span className="grid size-9 place-items-center rounded-[11px] bg-workflow/10 text-workflow"><CheckCircle2 className="size-[18px]" aria-hidden="true" /></span>
            </div>
          </div>
          <div className="rounded-[18px] bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-border/80">
            <p className="text-xs font-semibold text-muted-foreground">Assigned role</p>
            <div className="mt-5 flex items-end justify-between gap-3">
              <p className="font-heading truncate text-xl font-bold text-strong">{access.role}</p>
              <span className="grid size-9 shrink-0 place-items-center rounded-[11px] bg-info/10 text-info"><ShieldCheck className="size-[18px]" aria-hidden="true" /></span>
            </div>
          </div>
          <div className="rounded-[18px] bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-border/80">
            <p className="text-xs font-semibold text-muted-foreground">Access status</p>
            <div className="mt-5 flex items-end justify-between">
              <p className="font-heading text-xl font-bold text-strong">Active</p>
              <span className="flex items-center gap-2 text-xs font-semibold text-success"><span className="size-2 rounded-full bg-success" />Signed in</span>
            </div>
          </div>
        </div>
      </section>

      <section aria-labelledby="modules-title">
        <div className="mb-3 flex items-center gap-3">
          <div className="flex items-center gap-2 rounded-[9px] bg-info/10 px-3 py-2 text-[0.6875rem] font-bold tracking-[0.06em] text-info uppercase">
            <Building2 className="size-4" aria-hidden="true" />Modules
          </div>
          <div className="h-px flex-1 bg-border" />
        </div>
        <h3 id="modules-title" className="sr-only">Available modules</h3>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {modules.map((module) => {
            const meta = moduleMeta[module.label];
            const Icon = meta.icon;
            return (
              <Link key={module.href} href={module.href} className="group flex min-h-36 flex-col rounded-[18px] bg-card p-5 text-foreground shadow-[var(--shadow-card)] ring-1 ring-border/80 transition-[transform,box-shadow] hover:-translate-y-0.5 hover:text-foreground hover:shadow-[var(--shadow-menu)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                <div className="flex items-start justify-between">
                  <span className={`grid size-9 place-items-center rounded-[11px] ${meta.tone}`}><Icon className="size-[18px]" aria-hidden="true" /></span>
                  <ArrowRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:text-strong" aria-hidden="true" />
                </div>
                <div className="mt-auto pt-5">
                  <h4 className="font-heading text-base font-bold text-strong">{module.label}</h4>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{meta.description}</p>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      <section className="grid gap-3 lg:grid-cols-[1.25fr_0.75fr]">
        <div className="rounded-[18px] bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-border/80">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h3 className="font-heading text-base font-bold text-strong">Workspace foundation</h3>
              <p className="mt-1 text-xs text-muted-foreground">A suggested path through the modules available to you.</p>
            </div>
            <Building2 className="size-5 text-workflow" aria-hidden="true" />
          </div>
          <ol className="mt-5 grid gap-3 sm:grid-cols-3">
            {setupSteps.map((step, index) => (
              <li key={step.href}>
                <Link href={step.href} className="flex min-h-11 items-center gap-3 rounded-[11px] bg-[var(--surface-subtle)] px-3 py-3 text-xs font-semibold text-strong hover:bg-muted hover:text-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring">
                  <span className="font-numeric grid size-6 shrink-0 place-items-center rounded-lg bg-card text-[0.6875rem] text-muted-foreground ring-1 ring-border">{index + 1}</span>Open {step.label}
                </Link>
              </li>
            ))}
          </ol>
        </div>
        <div className="rounded-[18px] bg-sidebar-gradient p-5 text-sidebar-foreground shadow-[var(--shadow-menu)]">
          <Fingerprint className="size-5 text-primary" aria-hidden="true" />
          <h3 className="font-heading mt-5 text-base font-bold text-white">Source records stay trustworthy</h3>
          <p className="mt-2 text-xs leading-5 text-sidebar-foreground/65">Device events remain preserved while reviewed corrections are recorded beside them.</p>
        </div>
      </section>
    </div>
  );
}
