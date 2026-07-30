"use client";

import { Building2, CalendarDays, Fingerprint, LoaderCircle, MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import type React from "react";
import { useState } from "react";

import type { Brand } from "@/lib/brand";
import { organizationApi } from "@/lib/api/organization";
import { BrandMark } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const week = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export function SetupForm({ brand }: { brand: Brand }) {
  const router = useRouter();
  const [organization, setOrganization] = useState({ name: "", code: "" });
  const [branch, setBranch] = useState({ name: "", code: "", address: "" });
  const [days, setDays] = useState(() => week.map((_, weekday) => ({ weekday, isWorkingDay: weekday < 5, openingTime: weekday < 5 ? "08:00" : null, closingTime: weekday < 5 ? "17:00" : null })));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function updateDay(index: number, values: Partial<(typeof days)[number]>) {
    setDays((current) => current.map((day, dayIndex) => dayIndex === index ? { ...day, ...values } : day));
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await organizationApi.bootstrap({ organization, branch, days });
      router.replace("/dashboard");
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Setup could not be completed. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="min-h-svh bg-[var(--surface-subtle)] px-4 py-8 sm:px-8 lg:px-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-8 flex items-center gap-3">
          <BrandMark brand={brand} />
          <div><p className="font-heading text-sm font-bold text-strong">{brand.name}</p><p className="text-xs text-muted-foreground">Initial workspace setup</p></div>
        </header>
        <div className="mb-8 max-w-2xl"><p className="text-xs font-bold tracking-[0.08em] text-primary uppercase">Required before you begin</p><h1 className="font-heading mt-2 text-3xl font-bold tracking-[-0.03em] text-strong">Set up your organization</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Create the organization, first branch, and working week that will anchor attendance records.</p></div>

        <form onSubmit={submit} className="space-y-5">
          <section className="rounded-[18px] bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-border sm:p-7">
            <div className="mb-5 flex items-center gap-3"><span className="grid size-9 place-items-center rounded-[11px] bg-workflow/10 text-workflow"><Building2 className="size-[18px]" aria-hidden="true" /></span><div><h2 className="font-heading font-bold text-strong">Organization details</h2><p className="text-xs text-muted-foreground">The company workspace everyone will share.</p></div></div>
            <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-xs font-bold text-strong">Organization name<Input required value={organization.name} onChange={(event) => setOrganization({ ...organization, name: event.target.value })} placeholder="e.g. Acme Services" /></label><label className="space-y-2 text-xs font-bold text-strong">Organization code<Input required pattern="[A-Za-z0-9-]{2,20}" value={organization.code} onChange={(event) => setOrganization({ ...organization, code: event.target.value })} placeholder="ACME" /></label></div>
          </section>
          <section className="rounded-[18px] bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-border sm:p-7">
            <div className="mb-5 flex items-center gap-3"><span className="grid size-9 place-items-center rounded-[11px] bg-info/10 text-info"><MapPin className="size-[18px]" aria-hidden="true" /></span><div><h2 className="font-heading font-bold text-strong">First branch</h2><p className="text-xs text-muted-foreground">Where your first workforce and devices will operate.</p></div></div>
            <div className="grid gap-4 sm:grid-cols-2"><label className="space-y-2 text-xs font-bold text-strong">Branch name<Input required value={branch.name} onChange={(event) => setBranch({ ...branch, name: event.target.value })} placeholder="e.g. Main office" /></label><label className="space-y-2 text-xs font-bold text-strong">Branch code<Input required pattern="[A-Za-z0-9-]{2,20}" value={branch.code} onChange={(event) => setBranch({ ...branch, code: event.target.value })} placeholder="HQ" /></label><label className="space-y-2 text-xs font-bold text-strong sm:col-span-2">Address<Input required value={branch.address} onChange={(event) => setBranch({ ...branch, address: event.target.value })} placeholder="Street, city, country" /></label></div>
          </section>
          <section className="rounded-[18px] bg-card p-5 shadow-[var(--shadow-card)] ring-1 ring-border sm:p-7">
            <div className="mb-5 flex items-center gap-3"><span className="grid size-9 place-items-center rounded-[11px] bg-primary/10 text-primary"><CalendarDays className="size-[18px]" aria-hidden="true" /></span><div><h2 className="font-heading font-bold text-strong">Working week</h2><p className="text-xs text-muted-foreground">Defaulted to Monday–Friday, 08:00–17:00. Adjust as needed.</p></div></div>
            <div className="divide-y divide-border rounded-[11px] border border-border">{days.map((day, index) => <div key={day.weekday} className="grid items-center gap-3 px-3 py-3 sm:grid-cols-[1fr_auto_7rem_7rem]"><label className="flex items-center gap-3 text-xs font-semibold text-strong"><input type="checkbox" checked={day.isWorkingDay} onChange={(event) => updateDay(index, { isWorkingDay: event.target.checked, openingTime: event.target.checked ? (day.openingTime || "08:00") : null, closingTime: event.target.checked ? (day.closingTime || "17:00") : null })} className="size-4 accent-primary" />{week[index]}</label><span className="hidden text-[0.6875rem] text-muted-foreground sm:block">{day.isWorkingDay ? "Working day" : "Closed"}</span><Input aria-label={`${week[index]} opening time`} type="time" disabled={!day.isWorkingDay} value={day.openingTime || ""} onChange={(event) => updateDay(index, { openingTime: event.target.value || null })} className="h-9" /><Input aria-label={`${week[index]} closing time`} type="time" disabled={!day.isWorkingDay} value={day.closingTime || ""} onChange={(event) => updateDay(index, { closingTime: event.target.value || null })} className="h-9" /></div>)}</div>
          </section>
          {error ? <div role="alert" className="rounded-[11px] bg-destructive/8 px-4 py-3 text-sm text-destructive ring-1 ring-destructive/20">{error}</div> : null}
          <div className="flex justify-end"><Button type="submit" size="lg" disabled={submitting} className="h-11 min-w-48 rounded-[11px] font-bold shadow-[var(--shadow-action)]">{submitting ? <><LoaderCircle className="animate-spin" aria-hidden="true" />Creating workspace…</> : <><Fingerprint aria-hidden="true" />Create workspace</>}</Button></div>
        </form>
      </div>
    </main>
  );
}
