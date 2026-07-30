"use client";

import { useEffect, useState } from "react";

function formatTime(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  }).format(date);
}

export function LoginTimeSignal() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    const update = () => setNow(new Date());
    update();
    const interval = window.setInterval(update, 1000);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="mt-12 max-w-md" aria-label="Current local time">
      <div className="mb-3 flex items-center justify-between text-[0.6875rem] font-bold tracking-[0.07em] text-sidebar-foreground/55 uppercase">
        <span>{now ? formatDate(now) : "Your local workday"}</span>
        <span className="flex items-center gap-2 tracking-normal text-sidebar-foreground/75 normal-case">
          <span className="relative flex size-2" aria-hidden="true">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-50" />
            <span className="relative inline-flex size-2 rounded-full bg-primary" />
          </span>
          In focus
        </span>
      </div>
      <div className="relative h-px overflow-visible bg-white/12" aria-hidden="true">
        <div className="login-time-sweep absolute -top-px h-[3px] w-20 bg-primary shadow-[0_2px_12px_rgb(105_190_40_/_48%)]" />
        <span className="absolute -top-[3px] left-0 size-[7px] rounded-full bg-white/35" />
        <span className="absolute -top-[3px] left-1/2 size-[7px] rounded-full bg-white/20" />
        <span className="absolute -top-[3px] right-0 size-[7px] rounded-full bg-white/35" />
      </div>
      <div className="mt-4 flex items-baseline justify-between">
        <p
          className="font-numeric text-2xl font-semibold tracking-[-0.025em] text-white"
          aria-live="off"
        >
          {now ? formatTime(now) : "--:--:--"}
        </p>
        <p className="text-xs text-sidebar-foreground/50">Local time</p>
      </div>
    </div>
  );
}
