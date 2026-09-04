import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardLoading() {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-7">
      <span className="sr-only">Loading page</span>

      <div className="flex flex-wrap items-end justify-between gap-4" aria-hidden="true">
        <div className="flex flex-col gap-2.5">
          <Skeleton className="h-6 w-52" />
          <Skeleton className="h-3.5 w-72 max-w-full" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4" aria-hidden="true">
        {[0, 1, 2, 3].map((card) => (
          <div key={card} className="flex flex-col gap-3 border bg-card p-4">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-3 w-28" />
          </div>
        ))}
      </div>

      <div className="border bg-card" aria-hidden="true">
        <div className="flex items-center justify-between gap-4 border-b p-4">
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-8 w-56 max-w-[40%]" />
        </div>
        <div className="flex flex-col">
          {[0, 1, 2, 3, 4, 5].map((row) => (
            <div
              key={row}
              className="flex items-center gap-4 border-b p-4 last:border-b-0"
              style={{ opacity: 1 - row * 0.13 }}
            >
              <Skeleton className="size-9 shrink-0 rounded-full" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <Skeleton className="h-3.5 w-1/3 min-w-24" />
                <Skeleton className="h-3 w-1/2 min-w-32" />
              </div>
              <Skeleton className="hidden h-3 w-24 sm:block" />
              <Skeleton className="h-6 w-16 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
