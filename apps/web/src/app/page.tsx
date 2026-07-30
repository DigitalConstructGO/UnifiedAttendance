import { ArrowRight, CalendarCheck2, Fingerprint, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { getBrand } from "@/lib/brand";
import { BrandMark } from "@/components/brand-mark";

export default async function Home() {
  const brand = await getBrand();
  return (
    <main className="home-stage relative min-h-svh overflow-hidden bg-sidebar text-sidebar-foreground">
      <div className="home-ambient home-ambient-one" aria-hidden="true" />
      <div className="home-ambient home-ambient-two" aria-hidden="true" />

      <header className="relative z-20 mx-auto flex h-[72px] w-full max-w-[1440px] items-center justify-between px-5 sm:px-8 lg:px-12">
        <Link href="/" className="flex items-center gap-3 text-white hover:text-white">
          <BrandMark
            brand={brand}
            className="size-10 rounded-[12px] shadow-[var(--shadow-action)]"
          />
          <span>
            <span className="block max-w-[16rem] truncate font-heading text-sm font-bold tracking-[-0.02em]">
              {brand.name}
            </span>
            <span className="block text-[0.625rem] tracking-[0.07em] text-sidebar-foreground/65 uppercase">
              {brand.tagline}
            </span>
          </span>
        </Link>
        <nav className="flex items-center gap-2" aria-label="Primary navigation">
          <Link
            href="/login"
            className="grid min-h-11 place-items-center rounded-[11px] px-4 text-xs font-bold text-sidebar-foreground/75 transition-colors hover:bg-white/7 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Sign in
          </Link>
          <Link
            href="/dashboard"
            className="hidden min-h-11 items-center gap-2 rounded-[11px] bg-primary px-4 text-xs font-bold text-primary-foreground shadow-[var(--shadow-action)] transition-[background-color,transform] hover:-translate-y-px hover:bg-primary/90 hover:text-primary-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary sm:flex"
          >
            Open workspace
            <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </nav>
      </header>

      <section className="relative z-10 mx-auto grid min-h-[calc(100svh-72px)] w-full max-w-[1440px] items-center gap-10 px-5 py-12 sm:px-8 md:grid-cols-[0.82fr_1.18fr] md:gap-8 lg:gap-14 lg:px-12 lg:py-16">
        <div className="max-w-[39rem]">
          <div className="mb-8 flex items-center gap-3 text-[0.6875rem] font-bold tracking-[0.08em] text-primary uppercase">
            <span
              className="size-2 rounded-full bg-primary shadow-[0_2px_10px_rgb(105_190_40_/_55%)]"
              aria-hidden="true"
            />
            From event to decision
          </div>
          <h1 className="font-heading text-[clamp(3rem,7vw,6rem)] leading-[0.96] font-bold tracking-[-0.04em] text-balance text-white">
            Attendance you can trust.
          </h1>
          <p className="mt-7 max-w-xl text-[clamp(0.9375rem,1.4vw,1.125rem)] leading-8 text-sidebar-foreground/68">
            {brand.name} turns biometric events into clear attendance records—without losing the
            source data behind every decision.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link
              href="/login"
              className="flex min-h-12 items-center gap-2 rounded-[12px] bg-primary px-5 text-sm font-bold text-primary-foreground shadow-[var(--shadow-action)] transition-[background-color,transform,box-shadow] hover:-translate-y-px hover:bg-primary/90 hover:text-primary-foreground hover:shadow-[0_8px_24px_rgb(105_190_40_/_40%)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Enter the platform
              <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
        </div>

        <figure className="home-ledger relative mx-auto w-full max-w-[690px]">
          <figcaption className="sr-only">
            An illustrative attendance event moving from biometric capture through schedule rules
            into a preserved attendance record.
          </figcaption>
          <div className="home-ledger-frame">
            <div className="flex items-center justify-between border-b border-white/8 px-5 py-4">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <span className="relative flex size-2" aria-hidden="true">
                  <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-45" />
                  <span className="relative inline-flex size-2 rounded-full bg-primary" />
                </span>
                Attendance event path
              </div>
              <span className="font-numeric text-[0.625rem] tracking-[0.08em] text-sidebar-foreground/65 uppercase">
                Illustrated flow
              </span>
            </div>

            <div className="relative px-5 py-8 sm:px-8 sm:py-10">
              <div className="home-path" aria-hidden="true">
                <div className="home-path-progress" />
                <div className="home-event-token">
                  <Fingerprint className="size-4" />
                </div>
              </div>
              <ol className="relative grid gap-4 sm:grid-cols-3 sm:gap-5">
                <li className="home-step">
                  <span className="home-step-icon bg-info/12 text-info">
                    <Fingerprint className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[0.6875rem] font-bold tracking-[0.06em] text-info uppercase">
                      Captured
                    </p>
                    <h2 className="mt-1 font-heading text-base font-bold text-white">
                      Device event
                    </h2>
                    <p className="mt-2 text-xs leading-5 text-sidebar-foreground/65">
                      Identity and timestamp arrive unchanged.
                    </p>
                  </div>
                </li>
                <li className="home-step">
                  <span className="home-step-icon bg-workflow/12 text-[#9c8cff]">
                    <CalendarCheck2 className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[0.6875rem] font-bold tracking-[0.06em] text-[#b3a8ff] uppercase">
                      Evaluated
                    </p>
                    <h2 className="mt-1 font-heading text-base font-bold text-white">
                      Schedule rules
                    </h2>
                    <p className="mt-2 text-xs leading-5 text-sidebar-foreground/65">
                      Working time gives the event context.
                    </p>
                  </div>
                </li>
                <li className="home-step">
                  <span className="home-step-icon bg-primary/12 text-primary">
                    <ShieldCheck className="size-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-[0.6875rem] font-bold tracking-[0.06em] text-primary uppercase">
                      Accounted
                    </p>
                    <h2 className="mt-1 font-heading text-base font-bold text-white">
                      Trusted record
                    </h2>
                    <p className="mt-2 text-xs leading-5 text-sidebar-foreground/65">
                      A clear result with its source preserved.
                    </p>
                  </div>
                </li>
              </ol>
            </div>

            <div className="grid grid-cols-2 border-t border-white/8 text-[0.6875rem] sm:grid-cols-4">
              {["Workforce", "Schedules", "Corrections", "Reports"].map((capability) => (
                <span
                  key={capability}
                  className="border-white/8 px-4 py-3 text-center text-sidebar-foreground/65 not-last:border-r"
                >
                  {capability}
                </span>
              ))}
            </div>
          </div>
          <p className="mt-4 text-center text-xs text-sidebar-foreground/65">
            One connected foundation for people, branches, attendance, and the work around them.
          </p>
        </figure>
      </section>
    </main>
  );
}
