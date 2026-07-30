import { ArrowRight, Building2, CalendarDays, MapPin, ShieldCheck } from "lucide-react";
import type { SetupValues } from "./setup-model";

export function ReviewStep({
  values,
  onEdit,
}: {
  values: SetupValues;
  onEdit: (step: number) => void;
}) {
  const rows = [
    {
      icon: Building2,
      tone: "bg-workflow/10 text-workflow",
      title: values.organization.name,
      detail: `Organization · ${values.organization.code.toUpperCase()}`,
      step: 0,
    },
    {
      icon: MapPin,
      tone: "bg-info/10 text-info",
      title: values.branch.name,
      detail: `${values.branch.address} · ${values.branch.code.toUpperCase()}`,
      step: 1,
    },
    {
      icon: CalendarDays,
      tone: "bg-primary/10 text-primary",
      title: `${values.days.filter((day) => day.isWorkingDay).length} working days`,
      detail: `Attendance schedule · ${values.timezone}`,
      step: 2,
    },
  ];
  return (
    <section className="mt-2" aria-labelledby="review-heading">
      <h1
        id="review-heading"
        className="text-strong font-heading text-2xl font-bold tracking-[-0.025em]"
      >
        Review & activate
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Confirm the foundation of your workspace before creating it.
      </p>
      <div className="mt-7 divide-y divide-border overflow-hidden rounded-[14px] bg-card ring-1 ring-border">
        {rows.map(({ icon: Icon, tone, title, detail, step }) => (
          <button
            key={title}
            type="button"
            onClick={() => onEdit(step)}
            className="flex min-h-20 w-full items-center gap-4 px-5 text-left hover:bg-muted"
          >
            <span className={`grid size-9 place-items-center rounded-[11px] ${tone}`}>
              <Icon className="size-[18px]" />
            </span>
            <span className="flex-1">
              <span className="text-strong block text-xs font-bold">{title}</span>
              <span className="text-[0.6875rem] text-muted-foreground">{detail}</span>
            </span>
            <ArrowRight className="size-4 text-muted-foreground" />
          </button>
        ))}
      </div>
      <div className="mt-5 flex items-center gap-2 text-xs text-muted-foreground">
        <ShieldCheck className="size-4 text-primary" />
        All records are created together. Nothing is saved if setup fails.
      </div>
    </section>
  );
}
