import { auth } from "@UnifiedAttendance/auth";
import { Activity, BadgeCheck, ShieldCheck } from "lucide-react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { LoginForm } from "@/components/login-form";
import { LoginTimeSignal } from "@/components/login-time-signal";
import { BrandMark } from "@/components/brand-mark";
import { getBrand } from "@/lib/brand";

export default async function LoginPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session?.user) redirect("/dashboard");
  const brand = await getBrand();

  return (
    <main className="grid min-h-svh bg-card lg:grid-cols-[minmax(28rem,0.92fr)_minmax(32rem,1.08fr)]">
      <section className="bg-sidebar-gradient relative hidden overflow-hidden px-12 py-10 text-sidebar-foreground lg:flex lg:flex-col">
        <div
          className="pointer-events-none absolute -top-48 -right-40 size-[34rem] rounded-full border border-white/8"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute -top-32 -right-24 size-[24rem] rounded-full border border-primary/15"
          aria-hidden="true"
        />

        <div className="relative flex items-center gap-3">
          <BrandMark brand={brand} className="size-10 rounded-xl shadow-[var(--shadow-action)]" />
          <div>
            <p className="max-w-[18rem] truncate font-heading text-base font-bold tracking-[-0.02em] text-white">
              {brand.name}
            </p>
            <p className="text-[0.6875rem] font-semibold tracking-[0.08em] text-sidebar-foreground/60 uppercase">
              {brand.tagline}
            </p>
          </div>
        </div>

        <div className="relative my-auto max-w-xl py-16">
          <div className="mb-8 flex size-12 items-center justify-center rounded-[14px] border border-white/10 bg-white/6 text-primary">
            <Activity className="size-6" aria-hidden="true" />
          </div>
          <h1 className="max-w-lg font-heading text-[clamp(2.5rem,4vw,4.5rem)] leading-[1.02] font-bold tracking-[-0.035em] text-balance text-white">
            Every workday, accounted for.
          </h1>
          <p className="mt-6 max-w-md text-[0.9375rem] leading-7 text-sidebar-foreground/70">
            Turn attendance records into clear, trustworthy operational decisions across every
            employee and branch.
          </p>
          <LoginTimeSignal />
          <div className="mt-10 flex flex-wrap gap-x-7 gap-y-3 text-xs font-semibold text-sidebar-foreground/80">
            <span className="flex items-center gap-2">
              <ShieldCheck className="size-4 text-primary" aria-hidden="true" />
              Role-secured access
            </span>
            <span className="flex items-center gap-2">
              <BadgeCheck className="size-4 text-primary" aria-hidden="true" />
              Auditable records
            </span>
          </div>
        </div>

        <p className="relative text-xs text-sidebar-foreground/45">
          Attendance and business operations, in one place.
        </p>
      </section>

      <section className="relative flex min-h-svh items-center justify-center bg-[var(--surface-subtle)] px-5 py-10 sm:px-10 lg:min-h-0">
        <div className="absolute inset-x-0 top-0 h-1 bg-primary lg:hidden" aria-hidden="true" />
        <div className="w-full max-w-[27rem]">
          <div className="mb-9 flex items-center gap-3 lg:hidden">
            <BrandMark brand={brand} className="size-10 rounded-xl shadow-[var(--shadow-action)]" />
            <div>
              <p className="text-strong max-w-[18rem] truncate font-heading text-base font-bold tracking-[-0.02em]">
                {brand.name}
              </p>
              <p className="text-[0.6875rem] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                {brand.tagline}
              </p>
            </div>
          </div>
          <LoginForm />
        </div>
      </section>
    </main>
  );
}
